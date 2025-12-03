import type { ComponentType } from "react";

import HomeV1 from "@/app/versions/v1/page";
import HomeV2 from "@/app/versions/v2/page";
import HomeV3Fetes from "@/app/versions/v3-fetes/page";

const LANDING_VERSION = process.env.GATHER_LANDING_VERSION ?? "v3-fetes";

const versionsMap: Record<string, ComponentType> = {
  v1: HomeV1,
  v2: HomeV2,
  "v3-fetes": HomeV3Fetes,
};

// Point d’entrée unique : changez la variable d’environnement GATHER_LANDING_VERSION
// (v1 | v2 | v3-fetes) pour basculer la landing utilisée par défaut.
export default function HomePage() {
  const SelectedLanding = versionsMap[LANDING_VERSION] ?? HomeV3Fetes;
  return <SelectedLanding />;
}
