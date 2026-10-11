import { redirect } from "next/navigation";

/** /policies has no index of its own — land on the first policy. */
export default function PoliciesIndex() {
  redirect("/policies/shipping");
}
