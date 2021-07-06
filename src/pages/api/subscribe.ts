import { NextApiRequest, NextApiResponse } from "next";
import { query as q } from "faunadb";
import { stripe } from "../../services/stripe";
import { getSession } from "next-auth/client";
import { fauna } from "../../services/fauna";

type User = {
  ref: {
    id: string;
  };
  data: {
    stripe_customer_id: string;
  };
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    // Envia o req pois o Token está no header da requisição, logo, ao chamar getSession, retorna a sessão do usuário
    const session = await getSession({ req });

    // Procurando o usuário no banco para utilizar ele como ref no Update
    const user = await fauna.query<User>(
      q.Get(q.Match(q.Index("user_by_email"), q.Casefold(session.user.email)))
    );

    // Recebe o stripe customer id para ver se o usuário que está cadastrado no fauna possui cadastro no stripe
    let customerId = user.data.stripe_customer_id;

    if (!customerId) {
      // Criando um customer no stripe
      const stripeCustomer = await stripe.customers.create({
        email: session.user.email,
        // metadata
      });
      // Atualizando o id do Customer do usuário
      await fauna.query(
        q.Update(q.Ref(q.Collection("users"), user.ref.id), {
          data: {
            stripe_customer_id: stripeCustomer.id,
          },
        })
      );

      customerId = stripeCustomer.id;
    }

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId, //criando cliente no stripe
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [{ price: "price_1J4tezCEEzpzoMf5uKimooZh", quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });
    return res.status(200).json({ sessionId: stripeCheckoutSession.id });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method not allowed");
  }
};
