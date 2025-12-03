import CreateEventLanding from "@/app/core/landing/CreateEventLanding";

export default function HomeV2() {
  return (
    <CreateEventLanding
      accent="emerald"
      hero={{
        badge: "Gather • V2",
        titleStart: "Centralise",
        titleHighlight: "toutes les photos",
        titleEnd: "d’un événement en un scan.",
        description:
          "Une expérience repensée pour les tests privés : QR code + PIN, tout le monde dépose, tout le monde repart avec tout.",
        note:
          "Optimisée pour les petits groupes et les tournées de démonstration auprès des partenaires.",
      }}
      secondaryAction={{
        href: "/infos/investisseur-v2",
        label: "Découvrir la vision produit",
      }}
      ctaLabel="Créer un coffre V2"
    />
  );
}
