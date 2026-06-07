export const EXAMPLE_PROMPTS = [
  {
    label: "SaaS Pricing",
    prompt:
      "Build a SaaS pricing section with 3 tiers: Starter ($9/mo), Pro ($29/mo, most popular), and Enterprise ($99/mo). Add a monthly/yearly toggle with 20% annual savings. Each card should have a plan name, price, short description, 5 feature bullets with checkmarks, and a CTA button. Highlight the Pro tier with a gradient border and badge. Use a dark theme with violet accents.",
  },
  {
    label: "Login Form",
    prompt:
      "Create a modern login form inside a centered card. Include email and password fields with labels, a show/hide password toggle, remember-me checkbox, forgot password link, and a full-width gradient submit button. Add a divider and social login buttons for Google and GitHub. Include subtle hover states, focus rings, and form validation styling for empty fields.",
  },
  {
    label: "Stats Dashboard",
    prompt:
      "Design a dashboard stats grid with 4 metric cards: Total Users (12,847, +12.5%), Revenue ($48,290, +8.2%), Orders (1,429, -3.1%), and Growth Rate (24.8%, +5.4%). Each card needs an icon, label, large number, percentage change badge (green for up, red for down), and a mini sparkline placeholder bar. Add hover lift animation and a dark glass-morphism style.",
  },
] as const;

export const EXAMPLE_PROMPT = EXAMPLE_PROMPTS[0].prompt;
