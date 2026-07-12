import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { DOCUMENT_TYPE_LABELS, MATIERE_LABELS, SITE_NAME } from "@/lib/constants";
import type { DocumentMatiere, DocumentType } from "@/types/database";

interface NewContributionEmailInput {
  filiereNom: string;
  annee: number;
  matiere: DocumentMatiere;
  type: DocumentType;
  description: string;
  contributorName: string;
  contributorEmail: string;
}

/**
 * Notifie l'admin par email qu'un document attend une validation.
 * N'échoue jamais bruyamment : une erreur d'envoi est loggée mais ne bloque
 * pas la contribution (l'email est un "plus", pas une garantie de livraison).
 */
export async function notifyAdminNewContribution(
  input: NewContributionEmailInput
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.ADMIN_NOTIFICATION_EMAIL) {
    console.warn(
      "RESEND_API_KEY ou ADMIN_NOTIFICATION_EMAIL manquant : notification email ignorée."
    );
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const adminUrl = `${env.NEXT_PUBLIC_SITE_URL}/admin`;

  try {
    await resend.emails.send({
      from: `${SITE_NAME} <onboarding@resend.dev>`,
      to: env.ADMIN_NOTIFICATION_EMAIL,
      subject: `Nouvelle contribution en attente — ${input.filiereNom} ${input.annee}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="margin-bottom: 4px;">Nouveau document à valider</h2>
          <p style="color: #555; margin-top: 0;">Un contributeur vient de partager une épreuve.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tbody>
              <tr><td style="padding: 4px 0; color: #777;">Filière</td><td style="padding: 4px 0;">${input.filiereNom}</td></tr>
              <tr><td style="padding: 4px 0; color: #777;">Année</td><td style="padding: 4px 0;">${input.annee}</td></tr>
              <tr><td style="padding: 4px 0; color: #777;">Matière</td><td style="padding: 4px 0;">${MATIERE_LABELS[input.matiere]}</td></tr>
              <tr><td style="padding: 4px 0; color: #777;">Type</td><td style="padding: 4px 0;">${DOCUMENT_TYPE_LABELS[input.type]}</td></tr>
              ${input.description ? `<tr><td style="padding: 4px 0; color: #777;">Description</td><td style="padding: 4px 0;">${input.description}</td></tr>` : ""}
              ${input.contributorName ? `<tr><td style="padding: 4px 0; color: #777;">Contributeur</td><td style="padding: 4px 0;">${input.contributorName}</td></tr>` : ""}
              ${input.contributorEmail ? `<tr><td style="padding: 4px 0; color: #777;">Email</td><td style="padding: 4px 0;">${input.contributorEmail}</td></tr>` : ""}
            </tbody>
          </table>
          <a href="${adminUrl}" style="display: inline-block; background: #006b94; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
            Voir dans le tableau de bord
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error("Échec de l'envoi de l'email de notification admin:", error);
  }
}
