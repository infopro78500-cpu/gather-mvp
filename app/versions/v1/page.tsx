import CreateEventLanding from "@/app/core/landing/CreateEventLanding";

export default function HomeV1() {
  return (
    <CreateEventLanding
      accent="teal"
      hero={{
        badge: "Gather • V1",
        titleStart: "Crée un",
        titleHighlight: "coffre photo éphémère",
        titleEnd: "pour ton groupe.",
        description:
          "Le réflexe simple pour unifier toutes les photos d’un événement grâce à un PIN et un QR code partagé.",
        note:
          "Version historique : idéale pour les tests rapides et les premiers retours utilisateurs.",
      }}
      secondaryAction={{
        href: "/coming-soon",
        label: "Rejoindre l’early access",
      }}
    />
  );
}
