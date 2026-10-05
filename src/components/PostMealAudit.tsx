interface Props {
  mealId: string | null;
  foodName: string;
  triggered: boolean;
  delayMs?: number;
  ingredients?: Array<{ name: string; grams: number; cookMethod?: string }>;
  predictedFeeling?: "great" | "ok" | "crash";
}

/** G0 does not collect a personal model, and a tap is not training. */
export default function PostMealAudit(_props: Props) {
  return null;
}
