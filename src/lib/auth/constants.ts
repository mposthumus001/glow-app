import type {
  AuState,
  FeedingMethod,
  MapVisibility,
} from "@/lib/supabase/database.types";

export const AU_STATES: { value: AuState; label: string }[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

export const FEEDING_METHODS: { value: FeedingMethod; label: string }[] = [
  { value: "breastfeeding", label: "Breastfeeding" },
  { value: "bottle", label: "Bottle" },
  { value: "mixed", label: "Mixed" },
  { value: "solids", label: "Solids" },
  { value: "other", label: "Other" },
];

export const MAP_VISIBILITY_OPTIONS: {
  value: MapVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "hidden",
    label: "Hidden",
    description: "You won’t appear on the Glow map.",
  },
  {
    value: "state_only",
    label: "State only",
    description: "Others see your state, not your suburb.",
  },
  {
    value: "suburb_area",
    label: "Suburb area",
    description: "Optional coarse suburb label — never a street address.",
  },
];
