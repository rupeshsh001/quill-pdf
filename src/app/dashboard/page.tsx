import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import DashBoard from "~/components/DashBoard";
import { db } from "~/db";
import { getUserSubscriptionPlan } from "~/lib/stripe";

const Page = async () => {
    const { getUser } = getKindeServerSession();
    const user = getUser();

    if (!user || !user.id) redirect("/auth-callback?origin=dashboard");

    const dbUser = await db.user.findFirst({
        where: { id: user.id },
    });

    if (!dbUser) {
        redirect("/auth-callback?origin=dashboard");
    }

    const subscriptionPlan = await getUserSubscriptionPlan();

    return <DashBoard subscriptionPlan={subscriptionPlan} />;
};

export default Page;
