export interface BaseEventParams {
  timestamp?: number;
  user_id?: string;
  session_id?: string;
}

export interface OnboardingStartParams extends BaseEventParams {
  step: string;
}

export interface DogCreatedParams extends BaseEventParams {
  dog_id: string;
  breed: string;
  age_group: 'puppy' | 'adult' | 'senior';
}

export interface ViewItemListParams extends BaseEventParams {
  item_list_id: string;
  item_list_name: string;
}

export interface ViewItemParams extends BaseEventParams {
  items: {
    item_id: string;
    item_name: string;
    price: number;
    currency?: string;
  }[];
}

export interface AddToCartParams extends BaseEventParams {
  value: number;
  currency: string;
  items: {
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }[];
}

export interface SubscribeClickParams extends BaseEventParams {
  sku: string;
  location: string;
}

export interface SubscribeConfirmedParams extends BaseEventParams {
  subscription_id: string;
  cadence_days: number;
  value: number;
  currency: string;
}

export interface SubscriptionDateChangeParams extends BaseEventParams {
  subscription_id: string;
  days_delta: number;
}

export interface InboxOpenParams extends BaseEventParams {
  unread_count: number;
}

export interface NotificationClickParams extends BaseEventParams {
  channel: 'email' | 'push' | 'whatsapp' | 'inapp';
  template_key: string;
}

export interface MissionCompletedParams extends BaseEventParams {
  mission_id: string;
  xp: number;
  reward_type?: string;
}

export interface BadgeUnlockedParams extends BaseEventParams {
  badge_id: string;
}

export interface RewardRedeemedParams extends BaseEventParams {
  reward_id: string;
  order_id: string;
}

export type EventParams =
  | OnboardingStartParams
  | DogCreatedParams
  | ViewItemListParams
  | ViewItemParams
  | AddToCartParams
  | SubscribeClickParams
  | SubscribeConfirmedParams
  | SubscriptionDateChangeParams
  | InboxOpenParams
  | NotificationClickParams
  | MissionCompletedParams
  | BadgeUnlockedParams
  | RewardRedeemedParams;