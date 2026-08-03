interface SEOHeadProps {
  data: Record<string, unknown>;
}

export function SEOHead({ data }: SEOHeadProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}