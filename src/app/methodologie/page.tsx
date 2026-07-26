import type { Metadata } from 'next';
import Link from 'next/link';
import { BENCHMARKS } from '@/data/benchmarks';
import { SCORES_ARE_ILLUSTRATIVE } from '@/data/scores';
import { formatScore } from '@/lib/format';
import { BLENDED_MIX } from '@/lib/leaderboard';

export const metadata: Metadata = {
  title: 'Méthodologie',
  description:
    'Comment l’indice de qualité, le coût mixte et la frontière de Pareto sont calculés — et ce que ces chiffres ne disent pas.',
};

export default function MethodologyPage() {
  const totalWeight = BENCHMARKS.reduce((sum, b) => sum + b.weight, 0);

  return (
    <div className="max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Méthodologie
        </h1>
        <p className="mt-3 text-ink-secondary">
          Un classement de modèles n&apos;a de valeur que si l&apos;on peut vérifier
          d&apos;où viennent ses chiffres. Voici les calculs, les sources et les limites.
        </p>
      </header>

      {SCORES_ARE_ILLUSTRATIVE ? (
        <section
          aria-label="Statut des données"
          className="rounded-lg border border-hairline bg-warning/10 p-4 sm:p-6"
        >
          <h2 className="text-base font-semibold text-ink">Statut actuel des données</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            {'Les '}
            <strong className="text-ink">scores de benchmark</strong>
            {' de ce site sont aujourd’hui des valeurs de démonstration : elles font vivre '}
            {'l’interface et ne proviennent d’aucune mesure. Les '}
            <strong className="text-ink">tarifs, fenêtres de contexte et capacités</strong>
            {' sont, eux, relevés auprès des fournisseurs et datés modèle par modèle — la '}
            {'date de relevé et la source figurent sur chaque fiche.'}
          </p>
          <p className="mt-2 text-sm text-ink-secondary">
            {'Le harness d’évaluation est en place : trois commandes suffisent à remplacer '}
            {'cette démonstration par des mesures réelles, avec les traces d’appel conservées. '}
            {'Voir la section suivante.'}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-ink">D&apos;où viennent les scores</h2>
        <p className="mt-2 text-ink-secondary">
          Le dépôt contient son propre harness d&apos;évaluation. Il lance des suites de
          tâches sur les modèles, note les réponses et conserve chaque appel — prompt,
          sortie brute, tokens, latence, coût — dans un fichier de traces. Un score du site
          est donc rattachable à un run précis, pas à une déclaration.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-surface p-4 text-sm text-ink">
          <code>{`npm run bench -- doctor      # clés, accès aux modèles, bac à sable
npm run bench -- run --models=… --budget=5
npm run bench -- report      # tableau de synthèse
npm run bench -- export      # réécrit src/data/scores.ts`}</code>
        </pre>
        <p className="mt-3 text-ink-secondary">
          Le plafond de dépense est vérifié <em>avant</em> chaque appel, avec une estimation
          pessimiste : le run s&apos;arrête un appel trop tôt plutôt qu&apos;un appel trop
          tard. Un modèle dont l&apos;identifiant d&apos;API n&apos;est pas vérifié est
          refusé au lieu d&apos;être deviné, et un run contenant des modèles factices ne peut
          pas alimenter le site.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">
          Suites internes contre benchmarks publics
        </h2>
        <p className="mt-2 text-ink-secondary">
          Les <strong className="text-ink">suites internes</strong> sont écrites et exécutées
          ici : raisonnement vérifiable, respect de consigne, extraction structurée, appel
          d&apos;outils, code Python validé par des tests en conteneur isolé. Leur notation
          est déterministe — réponse exacte, JSON comparé en profondeur, séquence
          d&apos;appels, tests qui passent ou non. Pas de juge LLM dans le chemin par défaut,
          donc pas de biais de juge à corriger.
        </p>
        <p className="mt-3 text-ink-secondary">
          Les <strong className="text-ink">benchmarks publics</strong> (SWE-bench, GPQA,
          MMLU-Pro…) sont listés pour référence mais restent vides. Nous ne les exécutons
          pas ; y écrire des chiffres qui ne viennent pas de nous, sans source, serait
          exactement le travers que ce site cherche à éviter.
        </p>
        <p className="mt-3 text-ink-secondary">
          Le code produit par un modèle n&apos;est jamais exécuté sur la machine hôte. Sans
          conteneur disponible, les tâches de code sont marquées « ignorées » — et une tâche
          ignorée sort du dénominateur au lieu de compter comme un échec : personne
          n&apos;est puni pour une panne d&apos;infrastructure.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">L&apos;indice de qualité</h2>
        <p className="mt-2 text-ink-secondary">
          Moyenne des scores disponibles, pondérée par l&apos;importance de chaque suite, et
          renormalisée sur les seuls benchmarks renseignés. Un modèle évalué sur 4 suites
          n&apos;est donc pas pénalisé mécaniquement face à un modèle évalué sur 8 — mais sa
          couverture est affichée à côté de son score, parce qu&apos;un indice calculé sur
          la moitié des épreuves n&apos;a pas la même solidité.
        </p>
        <p className="mt-3 text-ink-secondary">
          {'Les poids totalisent '}
          {formatScore(totalWeight)}
          {'. Les suites agentiques et de code pèsent le plus : ce sont les moins saturées '}
          {'et les plus corrélées à l’usage réel. Les QCM de connaissances pèsent le moins, '}
          {'parce qu’ils sont les plus exposés à la contamination. '}
          <Link href="/benchmarks" className="underline underline-offset-2 hover:text-ink">
            Le détail des poids est sur la page benchmarks.
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Le coût mixte</h2>
        <p className="mt-2 text-ink-secondary">
          {'Les fournisseurs facturent l’entrée et la sortie à des tarifs différents, '}
          {'souvent d’un facteur 5. Comparer sur le seul prix d’entrée fausse le jugement. '}
          {'Le site combine les deux en un chiffre unique, au ratio '}
          {BLENDED_MIX.input}
          {' tokens d’entrée pour '}
          {BLENDED_MIX.output}
          {' de sortie — typique d’un usage conversationnel ou agentique.'}
        </p>
        <p className="mt-3 text-ink-secondary">
          Si votre charge penche fortement vers la génération longue, ce ratio vous
          désavantage : lisez alors directement les colonnes entrée et sortie du tableau,
          qui sont toujours affichées. Un seul axe de prix par graphique, jamais deux
          échelles superposées.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">La frontière de Pareto</h2>
        <p className="mt-2 text-ink-secondary">
          « Le meilleur modèle » n&apos;existe pas sans budget donné. Un modèle est sur la
          frontière si aucun autre n&apos;est à la fois au moins aussi bon et au moins aussi
          bon marché. Tout ce qui est en dehors est dominé : il existe une option
          strictement meilleure au même prix, ou aussi bonne pour moins cher. C&apos;est la
          seule lecture d&apos;un nuage qualité/prix qui ne dépende pas d&apos;un arbitrage
          implicite.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Les modèles auto-hébergés</h2>
        <p className="mt-2 text-ink-secondary">
          Un modèle à poids ouverts que vous exécutez vous-même n&apos;a pas de prix au
          token : il a un coût d&apos;infrastructure, qui dépend de votre matériel, de votre
          taux d&apos;utilisation et de votre débit. Le mettre à 0 $ sur un axe de coût
          serait mensonger. Ces modèles apparaissent donc dans le tableau mais pas dans le
          nuage, et leur nombre est indiqué sous le graphique — jamais retiré en silence.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Ce que ces chiffres ne disent pas</h2>
        <ul className="mt-3 space-y-3 text-ink-secondary">
          <li>
            <strong className="text-ink">La contamination.</strong> Les benchmarks publics
            finissent dans les données d&apos;entraînement. Un score élevé sur une suite
            ancienne mesure en partie la mémorisation. C&apos;est pourquoi les suites
            conçues contre la contamination pèsent plus lourd ici — et pourquoi un
            holdout privé reste indispensable pour trancher sérieusement.
          </li>
          <li>
            <strong className="text-ink">La reproductibilité.</strong> Un score n&apos;a de
            sens qu&apos;avec la version exacte du modèle, le prompt figé et les paramètres
            d&apos;échantillonnage. Les fournisseurs mettent à jour leurs modèles sous le
            même nom : deux mesures à un mois d&apos;écart ne sont pas nécessairement
            comparables.
          </li>
          <li>
            <strong className="text-ink">Le biais du juge.</strong> Sur les tâches
            subjectives, un juge LLM unique est biaisé par la position et la verbosité. Un
            classement sérieux utilise un panel, inverse les positions, et agrège en
            comparaisons par paires (Bradley-Terry / ELO) plutôt qu&apos;en moyenne de
            scores absolus.
          </li>
          <li>
            <strong className="text-ink">Le coût réel.</strong> Le prix au token n&apos;est
            pas le coût d&apos;usage. Un modèle deux fois moins cher qui consomme trois fois
            plus de tokens de raisonnement revient plus cher. Les tokenizers diffèrent
            aussi d&apos;un modèle à l&apos;autre : le même texte ne compte pas le même
            nombre de tokens partout.
          </li>
          <li>
            <strong className="text-ink">La latence.</strong> Elle n&apos;est pas suivie
            ici, et elle décide pourtant de beaucoup d&apos;architectures.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Sources et fraîcheur</h2>
        <p className="mt-2 text-ink-secondary">
          Chaque modèle porte sa date de relevé et les liens consultés, visibles sur sa
          fiche. Quand une valeur n&apos;a pas pu être vérifiée, le site affiche « n/d »
          plutôt qu&apos;une estimation : un blanc assumé vaut mieux qu&apos;un chiffre
          inventé. Les tarifs changent sans préavis — vérifiez auprès du fournisseur avant
          tout arbitrage budgétaire.
        </p>
      </section>
    </div>
  );
}
