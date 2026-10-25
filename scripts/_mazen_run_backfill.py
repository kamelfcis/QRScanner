"""Upload and run mazen-r2-backfill-urls.sql on the Mazen VPS database."""
import os
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

import paramiko

HOST = "95.217.137.18"
USER = "administrator"
PASSWORD = os.environ.get("MAZEN_VPS_PASSWORD", "")
ROOT = Path(__file__).resolve().parent
SQL = ROOT / "mazen-r2-backfill-urls.sql"
REMOTE_SQL = "C:/mazen-api/mazen-r2-backfill-urls.sql"
PSQL = r"C:\Program Files\PostgreSQL\18\bin\psql.exe"


def parse_db_url(url: str) -> tuple[str, str, str]:
    parsed = urlparse(url)
    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    db = (parsed.path or "/mazen").lstrip("/") or "mazen"
    return user, password, db


def read_db_url(env_text: str) -> str:
    for line in env_text.splitlines():
        clean = line.strip().lstrip("\ufeff")
        if clean.startswith("DATABASE_URL="):
            return clean.split("=", 1)[1].strip()
    for line in env_text.splitlines():
        clean = line.strip().lstrip("\ufeff")
        if clean.startswith("LOAD_DATABASE_URL="):
            return clean.split("=", 1)[1].strip()
    return ""


def main() -> int:
    if not PASSWORD:
        print("Set MAZEN_VPS_PASSWORD")
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)

    sftp = client.open_sftp()
    sftp.put(str(SQL), REMOTE_SQL)
    sftp.close()

    _, stdout, _ = client.exec_command("type C:\\mazen-api\\.env", timeout=30)
    env_text = stdout.read().decode("utf-8", errors="replace")
    db_url = read_db_url(env_text)
    if not db_url:
        print("DATABASE_URL missing on VPS")
        return 1

    user, db_pass, db_name = parse_db_url(db_url)
    cmd = (
        f'set PGPASSWORD={db_pass}&& "{PSQL}" -h 127.0.0.1 -U {user} -d {db_name} '
        f'-v ON_ERROR_STOP=1 -f "{REMOTE_SQL}"'
    )
    _, stdout, stderr = client.exec_command(cmd, timeout=180)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(out)
    if err.strip():
        print("STDERR:", err)
    client.close()
    return code


if __name__ == "__main__":
    sys.exit(main())
