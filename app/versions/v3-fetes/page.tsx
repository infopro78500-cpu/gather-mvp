import CreateEventLanding from "@/app/core/landing/CreateEventLanding";

export default function HomeV3Fetes() {
  return (
    <CreateEventLanding
      accent="purple"
      hero={{
        badge: "Gather • Version fêtes",
        titleStart: "Crée un",
        titleHighlight: "coffre photo spécial fêtes",
        titleEnd: "pour ton groupe.",
        description:
          "Un PIN + un QR code pour récupérer toutes les photos de Noël, Nouvel An, anniversaires, pots de fin d’année… en quelques secondes.",
        note:
          "Pensé pour les moments festifs où tout le monde prend des photos mais personne ne les récupère toutes.",
      }}
      secondaryAction={{
        href: "/coming-soon",
        label: "Participer à la communauté Gather 🎄",
      }}
      ctaLabel="Lancer le coffre des fêtes"
    />
  );
}
