"""Deploy Mazen R2 storage backend to VPS C:\\mazen-api (mazen only)."""
import os
import sys
from pathlib import Path

import paramiko

HOST = "95.217.137.18"
USER = "administrator"
PASSWORD = os.environ.get("MAZEN_VPS_PASSWORD", "")
ROOT = Path(__file__).resolve().parent.parent
SERVER = ROOT / "server"
REMOTE_API = "C:/mazen-api"

def r2_env_from_environ() -> dict[str, str]:
    access = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
    secret = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
    if not access or not secret:
        raise SystemExit("Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in the environment.")
    return {
        "STORAGE_BACKEND": "r2",
        "R2_ENDPOINT": os.environ.get(
            "R2_ENDPOINT",
            "https://3e14755463cbcc692836b8c18c4775a9.r2.cloudflarestorage.com",
        ),
        "R2_BUCKET": os.environ.get("R2_BUCKET", "mazenstore"),
        "R2_ACCESS_KEY_ID": access,
        "R2_SECRET_ACCESS_KEY": secret,
        "R2_PUBLIC_BASE_URL": os.environ.get(
            "R2_PUBLIC_BASE_URL",
            "https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev",
        ),
    }


def merge_env(content: str, updates: dict[str, str]) -> str:
    lines = content.splitlines()
    keys = set(updates)
    out = []
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line else ""
        if key in keys:
            continue
        out.append(line)
    for key, val in updates.items():
        out.append(f"{key}={val}")
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    if not PASSWORD:
        raise SystemExit("Set MAZEN_VPS_PASSWORD in the environment.")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)
    sftp = client.open_sftp()

    # Upload server source + package files
    for rel in ["package.json", "package-lock.json"]:
        local = SERVER / rel
        if local.exists():
            sftp.put(str(local), f"{REMOTE_API}/{rel}")

    remote_src = f"{REMOTE_API}/src"
    for local in (SERVER / "src").glob("*.js"):
        sftp.put(str(local), f"{remote_src}/{local.name}")

    # Merge R2 into remote .env
    env_path = f"{REMOTE_API}/.env"
    try:
        with sftp.open(env_path, "r") as f:
            env_text = f.read().decode("utf-8", errors="replace")
    except OSError:
        env_text = ""
    merged = merge_env(env_text, r2_env_from_environ())
    with sftp.open(env_path, "w") as f:
        f.write(merged.encode("utf-8"))

    sftp.close()

    restart_ps = (
        "$restarted=$false;"
        "foreach($task in @('MazenApi','mazen-api','Mazen-API')){"
        "if(schtasks /Query /TN $task 2>$null){"
        "schtasks /End /TN $task 2>$null;Start-Sleep 2;schtasks /Run /TN $task;"
        "Write-Output \"restarted_task=$task\";$restarted=$true;break}};"
        "if(-not $restarted -and (Test-Path 'C:/mazen-api/start-api.cmd')){"
        "Start-Process -WindowStyle Hidden -FilePath 'C:/mazen-api/start-api.cmd' -WorkingDirectory 'C:/mazen-api';"
        "Write-Output 'started_start_api_cmd'}"
    )
    steps = [
        f'cd /d "{REMOTE_API}" && npm install --omit=dev 2>&1',
        f'powershell -NoProfile -Command "{restart_ps}"',
        'powershell -NoProfile -Command "Start-Sleep 5; try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3017/health -TimeoutSec 15).Content } catch { $_.Exception.Message }"',
    ]
    for cmd in steps:
        print(f"\n>>> {cmd[:80]}...")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        code = stdout.channel.recv_exit_status()
        print(out[-4000:] if len(out) > 4000 else out)
        if err.strip():
            print("STDERR:", err[-2000:])
        print("exit", code)
        if code != 0 and "npm install" in cmd:
            return code

    client.close()
    print("\nMazen R2 deploy complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
