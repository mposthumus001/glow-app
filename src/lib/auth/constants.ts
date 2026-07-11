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
    description: "You won’t appear on the Glow map at all.",
  },
  {
    value: "state_only",
    label: "State",
    description:
      "Others may see that someone in your state is awake — never your suburb or street.",
  },
  {
    value: "suburb_area",
    label: "Suburb area",
    description:
      "Optional coarse suburb label for approximate clusters. Exact GPS is never shown. Suburb lights only appear when enough parents are awake nearby (at least five).",
  },
];
