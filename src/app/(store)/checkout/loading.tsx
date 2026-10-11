import { CheckoutSkeleton } from "@/components/store/checkout/checkout-form";

export default function CheckoutLoading() {
  return (
    <div className="container-luxe pb-16 pt-6 md:pb-24 md:pt-10">
      <div className="skeleton h-6 w-64 rounded-full" />
      <div className="mb-10 mt-8 md:mb-12">
        <div className="skeleton h-3 w-36 rounded-full" />
        <div className="skeleton mt-4 h-10 w-56 rounded-full md:h-12" />
        <div className="skeleton mt-4 h-4 w-80 max-w-full rounded-full" />
      </div>
      <CheckoutSkeleton />
    </div>
  );
}
