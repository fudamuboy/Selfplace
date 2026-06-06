import client from './client';

export interface SubscriptionStatus {
  plan_type: 'free' | 'plus' | 'signature';
  is_active: boolean;
  expires_at: string | null;
}

export const getSubscription = async (): Promise<SubscriptionStatus> => {
  const res = await client.get('/user/subscription');
  return res.data;
};

export const updateSubscription = async (planType: 'free' | 'plus' | 'signature'): Promise<{ message: string; subscription: SubscriptionStatus }> => {
  const res = await client.put('/user/subscription', { planType });
  return res.data;
};
