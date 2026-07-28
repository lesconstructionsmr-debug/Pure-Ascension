/**
 * Alias endpoint — delegates to the shared scan-meal handler & core pipeline.
 * Kept for backward compatibility with existing client routes.
 */
export {
  handler,
  type IdentifiedFoodItem,
  type MealOutput,
  type ScanMealSuccessResponse,
} from './scan-meal';
