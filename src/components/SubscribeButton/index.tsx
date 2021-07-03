import { signIn, useSession } from "next-auth/client";
import { api } from "../../services/api";
import { getStripeJs } from "../../services/stripe-js";
import styles from "./styles.module.scss";

interface SubscribeButtonProps {
  priceId: string;
}

export function SubscribeButton({ priceId }: SubscribeButtonProps) {
  const [session] = useSession();

  async function handleSubscribe() {
    // Caso o usuário não esteja logado, ele vai redirecionar para fazer o login
    if (!session) {
      signIn("github");
      return;
    }

    try {
      // Faz a requisição para a Api route para criar um customer no stripe
      const response = await api.post("/subscribe");

      const { sessionId } = response.data;

      // O getStripeJs é uma funcionalidade fornecida para o front-end do Stripe, que serve para redirecionar para o meio de pagamento
      const stripe = await getStripeJs();

      // Caso dê tudo certo, redireciona o usuário para o Checkout para efetuar o pagamento
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <button
      type="button"
      className={styles.subscribeButton}
      onClick={() => handleSubscribe()}
    >
      Subscribe Now
    </button>
  );
}
