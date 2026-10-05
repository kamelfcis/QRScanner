-- Case-insensitive unique InstaPay transfer references for active proofs (Mazen Store).
-- Rejected proofs may reuse the same reference; pending/confirmed block reuse.
CREATE UNIQUE INDEX IF NOT EXISTS idx_instapay_proof_reference_unique
  ON public.instapay_delivery_proofs (UPPER(proof_reference))
  WHERE proof_reference IS NOT NULL
    AND status IN ('pending', 'confirmed');
