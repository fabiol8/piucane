/**
 * GA4 Events Schema for PiuCane Platform
 *
 * This file defines all GA4 events and their parameters according to
 * PROMPTMASTER.md requirements (Section 7) and CTA Registry mapping.
 *
 * @version 1.0.0
 * @lastUpdated 2024-09-28
 */

import { z } from 'zod';

// Base event schema
export const BaseEventSchema = z.object({
  event_name: z.string(),
  timestamp: z.number().optional(),
  user_id: z.string().optional(),
  session_id: z.string().optional(),
  cta_id: z.string().optional(),
  page_location: z.string().optional(),
  page_title: z.string().optional(),
});

// Enhanced E-commerce Parameters
export const EcommerceItemSchema = z.object({
  item_id: z.string(),
  item_name: z.string(),
  category: z.string().optional(),
  quantity: z.number(),
  price: z.number(),
  currency: z.string().default('EUR'),
  item_variant: z.string().optional(),
  item_brand: z.string().default('PiuCane'),
  item_category2: z.string().optional(),
  item_category3: z.string().optional(),
  item_list_id: z.string().optional(),
  item_list_name: z.string().optional(),
  index: z.number().optional(),
  discount: z.number().optional(),
});

// === ONBOARDING EVENTS ===
export const OnboardingStartedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('onboarding_started'),
  step: z.string(),
  source: z.string().optional(),
});

export const OnboardingStepCompletedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('onboarding_step_completed'),
  step: z.string(),
  step_number: z.number(),
  total_steps: z.number(),
  completion_time: z.number().optional(),
});

export const OnboardingCompletedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('onboarding_completed'),
  total_time: z.number(),
  steps_completed: z.number(),
  dogs_added: z.number(),
});

// === DOG MANAGEMENT EVENTS ===
export const DogCreatedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('dog_created'),
  dog_id: z.string(),
  breed: z.string(),
  age_group: z.enum(['puppy', 'adult', 'senior']),
  size: z.enum(['small', 'medium', 'large', 'giant']),
  weight: z.number().optional(),
  gender: z.enum(['male', 'female']).optional(),
  is_neutered: z.boolean().optional(),
});

export const DogProfileSavedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('dog_profile_saved'),
  dog_id: z.string(),
  fields_updated: z.array(z.string()),
  has_health_issues: z.boolean().optional(),
  has_allergies: z.boolean().optional(),
});

export const VaccinationAddedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('vaccination_added'),
  dog_id: z.string(),
  vaccine_type: z.string(),
  due_date: z.string().optional(),
  veterinarian_id: z.string().optional(),
});

export const VeterinarianSelectedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('veterinarian_selected'),
  dog_id: z.string(),
  veterinarian_id: z.string(),
  clinic_name: z.string().optional(),
});

// === E-COMMERCE EVENTS ===
export const ViewItemListEventSchema = BaseEventSchema.extend({
  event_name: z.literal('view_item_list'),
  item_list_id: z.string(),
  item_list_name: z.string(),
  items: z.array(EcommerceItemSchema),
});

export const ViewItemEventSchema = BaseEventSchema.extend({
  event_name: z.literal('view_item'),
  currency: z.string().default('EUR'),
  value: z.number(),
  items: z.array(EcommerceItemSchema),
});

export const AddToCartEventSchema = BaseEventSchema.extend({
  event_name: z.literal('add_to_cart'),
  currency: z.string().default('EUR'),
  value: z.number(),
  items: z.array(EcommerceItemSchema),
  dog_id: z.string().optional(),
});

export const ViewCartEventSchema = BaseEventSchema.extend({
  event_name: z.literal('view_cart'),
  currency: z.string().default('EUR'),
  value: z.number(),
  items: z.array(EcommerceItemSchema),
  cart_size: z.number(),
});

export const BeginCheckoutEventSchema = BaseEventSchema.extend({
  event_name: z.literal('begin_checkout'),
  currency: z.string().default('EUR'),
  value: z.number(),
  items: z.array(EcommerceItemSchema),
  coupon: z.string().optional(),
});

export const CheckoutStepEventSchema = BaseEventSchema.extend({
  event_name: z.literal('checkout_step'),
  from_step: z.number(),
  to_step: z.number(),
  step_id: z.string(),
  value: z.string().optional(),
});

export const CartUpdateEventSchema = BaseEventSchema.extend({
  event_name: z.literal('cart_update'),
  product_id: z.string(),
  format_id: z.string(),
  new_quantity: z.number(),
});

export const RemoveFromCartEventSchema = BaseEventSchema.extend({
  event_name: z.literal('remove_from_cart'),
  product_id: z.string(),
  format_id: z.string(),
});

export const CartClearEventSchema = BaseEventSchema.extend({
  event_name: z.literal('cart_clear'),
  previous_item_count: z.number(),
});

export const SubscriptionChangeEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscription_change'),
  product_id: z.string(),
  format_id: z.string(),
  subscription_frequency: z.enum(['none', 'monthly', 'bimonthly', 'quarterly']),
  value: z.string().optional(),
});

export const DosagePersonalizedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('dosage_personalized'),
  product_id: z.string(),
  format_id: z.string(),
  daily_amount: z.number(),
  duration_days: z.number().optional(),
});

export const CartInteractionEventSchema = BaseEventSchema.extend({
  event_name: z.literal('cart_interaction'),
  value: z.string(),
  item_count: z.number().optional(),
  total_amount: z.number().optional(),
  unique_products: z.number().optional(),
  has_subscriptions: z.boolean().optional(),
});

export const AddPaymentInfoEventSchema = BaseEventSchema.extend({
  event_name: z.literal('add_payment_info'),
  currency: z.string().default('EUR'),
  value: z.number(),
  payment_type: z.enum(['card', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay']),
});

export const PurchaseEventSchema = BaseEventSchema.extend({
  event_name: z.literal('purchase'),
  transaction_id: z.string(),
  currency: z.string().default('EUR'),
  value: z.number(),
  tax: z.number().optional(),
  shipping: z.number().optional(),
  coupon: z.string().optional(),
  items: z.array(EcommerceItemSchema),
  payment_method: z.string(),
  is_subscription: z.boolean().optional(),
});

// === SUBSCRIPTION EVENTS ===
export const SubscribeClickEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscribe_click'),
  sku: z.string(),
  location: z.string(),
  dog_id: z.string().optional(),
  product_name: z.string(),
});

export const SubscriptionStartedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscription_started'),
  subscription_id: z.string(),
  plan_name: z.string(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  dog_id: z.string(),
  value: z.number(),
  currency: z.string().default('EUR'),
});

export const SubscriptionConfirmedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscription_confirmed'),
  subscription_id: z.string(),
  cadence_days: z.number(),
  value: z.number(),
  currency: z.string().default('EUR'),
  first_delivery_date: z.string(),
});

export const SubscriptionDateChangeEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscription_date_change'),
  subscription_id: z.string(),
  days_delta: z.number(),
  new_delivery_date: z.string(),
  reason: z.string().optional(),
});

export const SubscriptionPausedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscription_paused'),
  subscription_id: z.string(),
  pause_duration: z.number().optional(),
  reason: z.string().optional(),
});

export const SubscriptionCancelledEventSchema = BaseEventSchema.extend({
  event_name: z.literal('subscription_cancelled'),
  subscription_id: z.string(),
  cancellation_reason: z.string(),
  refund_amount: z.number().optional(),
});

// === MESSAGING & COMMUNICATION EVENTS ===
export const InboxOpenEventSchema = BaseEventSchema.extend({
  event_name: z.literal('inbox_open'),
  unread_count: z.number(),
  total_messages: z.number(),
});

export const NotificationClickEventSchema = BaseEventSchema.extend({
  event_name: z.literal('notification_click'),
  channel: z.enum(['email', 'push', 'whatsapp', 'inapp']),
  template_key: z.string(),
  message_id: z.string(),
  campaign_id: z.string().optional(),
});

export const MessageSentEventSchema = BaseEventSchema.extend({
  event_name: z.literal('message_sent'),
  recipient_type: z.enum(['user', 'admin', 'ai']),
  channel: z.enum(['email', 'push', 'whatsapp', 'inapp', 'chat']),
  template_key: z.string().optional(),
  is_automated: z.boolean(),
});

// === GAMIFICATION EVENTS ===
export const MissionStartedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('mission_started'),
  mission_id: z.string(),
  mission_type: z.enum(['daily', 'weekly', 'monthly', 'special']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  xp_reward: z.number(),
});

export const MissionCompletedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('mission_completed'),
  mission_id: z.string(),
  xp: z.number(),
  reward_type: z.enum(['xp', 'badge', 'coupon', 'points']),
  completion_time: z.number(),
  dog_id: z.string().optional(),
});

export const BadgeUnlockedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('badge_unlocked'),
  badge_id: z.string(),
  badge_name: z.string(),
  badge_category: z.string(),
  total_badges: z.number(),
});

export const RewardClaimedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('reward_claimed'),
  reward_id: z.string(),
  reward_type: z.enum(['coupon', 'points', 'free_product', 'discount']),
  reward_value: z.number(),
  points_spent: z.number().optional(),
});

export const RewardRedeemedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('reward_redeemed'),
  reward_id: z.string(),
  order_id: z.string(),
  discount_amount: z.number(),
  currency: z.string().default('EUR'),
});

// === AI AGENTS EVENTS ===
export const AiChatStartedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('ai_chat_started'),
  agent_type: z.enum(['vet', 'educator', 'groomer']),
  dog_id: z.string().optional(),
  conversation_id: z.string(),
});

export const AiVetSelectedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('ai_vet_selected'),
  dog_id: z.string(),
  symptoms_category: z.string().optional(),
  urgency_level: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export const AiEducatorSelectedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('ai_educator_selected'),
  dog_id: z.string(),
  training_goal: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

export const AiGroomerSelectedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('ai_groomer_selected'),
  dog_id: z.string(),
  coat_type: z.string().optional(),
  grooming_frequency: z.string().optional(),
});

export const AiMessageSentEventSchema = BaseEventSchema.extend({
  event_name: z.literal('ai_message_sent'),
  agent_type: z.enum(['vet', 'educator', 'groomer']),
  conversation_id: z.string(),
  message_length: z.number(),
  contains_urgency: z.boolean().optional(),
  contains_product_mention: z.boolean().optional(),
});

export const AiResponseReceivedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('ai_response_received'),
  agent_type: z.enum(['vet', 'educator', 'groomer']),
  conversation_id: z.string(),
  response_time: z.number(),
  flagged_urgent: z.boolean().optional(),
  products_suggested: z.number().optional(),
  tools_used: z.array(z.string()).optional(),
});

// === AUTHENTICATION EVENTS ===
export const LoginStartedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('login_started'),
  method: z.enum(['email', 'google', 'apple']),
});

export const LoginEventSchema = BaseEventSchema.extend({
  event_name: z.literal('login'),
  method: z.enum(['email', 'google', 'apple']),
  user_type: z.enum(['customer', 'admin']).optional(),
});

export const SignUpEventSchema = BaseEventSchema.extend({
  event_name: z.literal('sign_up'),
  method: z.enum(['email', 'google', 'apple']),
  referral_source: z.string().optional(),
});

// === NAVIGATION EVENTS ===
export const PageViewEventSchema = BaseEventSchema.extend({
  event_name: z.literal('page_view'),
  page_title: z.string(),
  page_location: z.string(),
  content_group1: z.string().optional(),
  content_group2: z.string().optional(),
});

export const NavigationClickEventSchema = BaseEventSchema.extend({
  event_name: z.literal('navigation_click'),
  link_text: z.string(),
  link_url: z.string(),
  section: z.string(),
});

// === ADMIN EVENTS ===
export const AdminLoginEventSchema = BaseEventSchema.extend({
  event_name: z.literal('admin_login'),
  admin_role: z.string(),
  login_method: z.enum(['email', 'mfa']),
});

export const AdminProductCreatedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('admin_product_created'),
  product_type: z.enum(['food', 'supplement', 'accessory', 'toy']),
  category: z.string(),
  price: z.number(),
  has_subscription: z.boolean(),
});

export const AdminUserManagedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('admin_user_managed'),
  action: z.enum(['view', 'edit', 'suspend', 'delete', 'export']),
  user_type: z.enum(['customer', 'admin']),
  affected_subscriptions: z.number().optional(),
});

// === SEARCH & DISCOVERY EVENTS ===
export const SearchEventSchema = BaseEventSchema.extend({
  event_name: z.literal('search'),
  search_term: z.string(),
  search_category: z.string().optional(),
  results_count: z.number(),
});

export const SelectItemEventSchema = BaseEventSchema.extend({
  event_name: z.literal('select_item'),
  item_list_id: z.string(),
  item_list_name: z.string(),
  items: z.array(EcommerceItemSchema),
});

// === WAREHOUSE & FULFILLMENT EVENTS ===
export const OrderShippedEventSchema = BaseEventSchema.extend({
  event_name: z.literal('order_shipped'),
  order_id: z.string(),
  tracking_number: z.string(),
  carrier: z.string(),
  shipping_method: z.string(),
  is_subscription_order: z.boolean(),
});

export const OrderDeliveredEventSchema = BaseEventSchema.extend({
  event_name: z.literal('order_delivered'),
  order_id: z.string(),
  delivery_time: z.number(),
  delivery_rating: z.number().optional(),
});

// Union type for all events
export type GA4Event =
  | z.infer<typeof OnboardingStartedEventSchema>
  | z.infer<typeof OnboardingStepCompletedEventSchema>
  | z.infer<typeof OnboardingCompletedEventSchema>
  | z.infer<typeof DogCreatedEventSchema>
  | z.infer<typeof DogProfileSavedEventSchema>
  | z.infer<typeof VaccinationAddedEventSchema>
  | z.infer<typeof VeterinarianSelectedEventSchema>
  | z.infer<typeof ViewItemListEventSchema>
  | z.infer<typeof ViewItemEventSchema>
  | z.infer<typeof AddToCartEventSchema>
  | z.infer<typeof ViewCartEventSchema>
  | z.infer<typeof BeginCheckoutEventSchema>
  | z.infer<typeof CheckoutStepEventSchema>
  | z.infer<typeof CartUpdateEventSchema>
  | z.infer<typeof RemoveFromCartEventSchema>
  | z.infer<typeof CartClearEventSchema>
  | z.infer<typeof SubscriptionChangeEventSchema>
  | z.infer<typeof DosagePersonalizedEventSchema>
  | z.infer<typeof CartInteractionEventSchema>
  | z.infer<typeof AddPaymentInfoEventSchema>
  | z.infer<typeof PurchaseEventSchema>
  | z.infer<typeof SubscribeClickEventSchema>
  | z.infer<typeof SubscriptionStartedEventSchema>
  | z.infer<typeof SubscriptionConfirmedEventSchema>
  | z.infer<typeof SubscriptionDateChangeEventSchema>
  | z.infer<typeof SubscriptionPausedEventSchema>
  | z.infer<typeof SubscriptionCancelledEventSchema>
  | z.infer<typeof InboxOpenEventSchema>
  | z.infer<typeof NotificationClickEventSchema>
  | z.infer<typeof MessageSentEventSchema>
  | z.infer<typeof MissionStartedEventSchema>
  | z.infer<typeof MissionCompletedEventSchema>
  | z.infer<typeof BadgeUnlockedEventSchema>
  | z.infer<typeof RewardClaimedEventSchema>
  | z.infer<typeof RewardRedeemedEventSchema>
  | z.infer<typeof AiChatStartedEventSchema>
  | z.infer<typeof AiVetSelectedEventSchema>
  | z.infer<typeof AiEducatorSelectedEventSchema>
  | z.infer<typeof AiGroomerSelectedEventSchema>
  | z.infer<typeof AiMessageSentEventSchema>
  | z.infer<typeof AiResponseReceivedEventSchema>
  | z.infer<typeof LoginStartedEventSchema>
  | z.infer<typeof LoginEventSchema>
  | z.infer<typeof SignUpEventSchema>
  | z.infer<typeof PageViewEventSchema>
  | z.infer<typeof NavigationClickEventSchema>
  | z.infer<typeof AdminLoginEventSchema>
  | z.infer<typeof AdminProductCreatedEventSchema>
  | z.infer<typeof AdminUserManagedEventSchema>
  | z.infer<typeof SearchEventSchema>
  | z.infer<typeof SelectItemEventSchema>
  | z.infer<typeof OrderShippedEventSchema>
  | z.infer<typeof OrderDeliveredEventSchema>;

// Event schema mapping for validation
export const eventSchemaMap = {
  'onboarding_started': OnboardingStartedEventSchema,
  'onboarding_step_completed': OnboardingStepCompletedEventSchema,
  'onboarding_completed': OnboardingCompletedEventSchema,
  'dog_created': DogCreatedEventSchema,
  'dog_profile_saved': DogProfileSavedEventSchema,
  'vaccination_added': VaccinationAddedEventSchema,
  'veterinarian_selected': VeterinarianSelectedEventSchema,
  'view_item_list': ViewItemListEventSchema,
  'view_item': ViewItemEventSchema,
  'add_to_cart': AddToCartEventSchema,
  'view_cart': ViewCartEventSchema,
  'begin_checkout': BeginCheckoutEventSchema,
  'checkout_step': CheckoutStepEventSchema,
  'cart_update': CartUpdateEventSchema,
  'remove_from_cart': RemoveFromCartEventSchema,
  'cart_clear': CartClearEventSchema,
  'subscription_change': SubscriptionChangeEventSchema,
  'dosage_personalized': DosagePersonalizedEventSchema,
  'cart_interaction': CartInteractionEventSchema,
  'add_payment_info': AddPaymentInfoEventSchema,
  'purchase': PurchaseEventSchema,
  'subscribe_click': SubscribeClickEventSchema,
  'subscription_started': SubscriptionStartedEventSchema,
  'subscription_confirmed': SubscriptionConfirmedEventSchema,
  'subscription_date_change': SubscriptionDateChangeEventSchema,
  'subscription_paused': SubscriptionPausedEventSchema,
  'subscription_cancelled': SubscriptionCancelledEventSchema,
  'inbox_open': InboxOpenEventSchema,
  'notification_click': NotificationClickEventSchema,
  'message_sent': MessageSentEventSchema,
  'mission_started': MissionStartedEventSchema,
  'mission_completed': MissionCompletedEventSchema,
  'badge_unlocked': BadgeUnlockedEventSchema,
  'reward_claimed': RewardClaimedEventSchema,
  'reward_redeemed': RewardRedeemedEventSchema,
  'ai_chat_started': AiChatStartedEventSchema,
  'ai_vet_selected': AiVetSelectedEventSchema,
  'ai_educator_selected': AiEducatorSelectedEventSchema,
  'ai_groomer_selected': AiGroomerSelectedEventSchema,
  'ai_message_sent': AiMessageSentEventSchema,
  'ai_response_received': AiResponseReceivedEventSchema,
  'login_started': LoginStartedEventSchema,
  'login': LoginEventSchema,
  'sign_up': SignUpEventSchema,
  'page_view': PageViewEventSchema,
  'navigation_click': NavigationClickEventSchema,
  'admin_login': AdminLoginEventSchema,
  'admin_product_created': AdminProductCreatedEventSchema,
  'admin_user_managed': AdminUserManagedEventSchema,
  'search': SearchEventSchema,
  'select_item': SelectItemEventSchema,
  'order_shipped': OrderShippedEventSchema,
  'order_delivered': OrderDeliveredEventSchema,
} as const;

export type EventName = keyof typeof eventSchemaMap;

/**
 * Validates an event against its schema
 */
export function validateEvent(eventName: EventName, eventData: any): boolean {
  try {
    const schema = eventSchemaMap[eventName];
    schema.parse(eventData);
    return true;
  } catch (error) {
    console.error(`Event validation failed for ${eventName}:`, error);
    return false;
  }
}

/**
 * Type guard to check if an event is valid
 */
export function isValidEvent(event: any): event is GA4Event {
  if (!event || typeof event !== 'object' || !event.event_name) {
    return false;
  }

  return validateEvent(event.event_name, event);
}
