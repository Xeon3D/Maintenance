import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [];

const text: HelpText = {
  en: `# Categories

Coloured labels for work orders, such as Warranty, Billable or Callout, that you can filter the work order list by.

## What categories are for

The work order type (reactive, preventive, corrective and so on) says what kind of job it is. Categories add your own labels on top, for whatever your company needs to tell apart: jobs covered by warranty, jobs to invoice, out-of-hours callouts, a particular project. A work order can have several categories, or none.

Once at least one category exists:

- The work order form shows a **Categories** field where you tick the ones that apply.
- The work order list and the work order page show them as coloured chips.
- The work order list has an **All categories** filter to show only the jobs with one category.

See [Work orders](/help/work-orders).

## Managing categories

Open **Settings → Categories**.

1. Under **New category**, pick a colour and type the name (up to 40 characters).
2. Click **Create**.

Each existing category is listed with how many work orders use it. To rename it or change its colour, edit it in place and click **Save**. Two categories can't have the same name, whatever the capitals.

The bin deletes a category after a confirmation. It is only removed from its work orders; the work orders themselves stay as they are.

> Keep the list short and agree on what each category means, so that everyone labels jobs the same way and the filter stays useful.

## Who can do what

- **Super Admin**, **Administrator** and **Manager** can create, edit and delete categories.
- Anyone who can edit a work order can tick its categories, and everyone who sees work orders sees the chips and can use the filter.
`,
  pt: `# Categorias

Etiquetas coloridas para ordens de trabalho, como Garantia, Faturável ou Chamada, pelas quais pode filtrar a lista de ordens de trabalho.

## Para que servem as categorias

O tipo da ordem de trabalho (reativa, preventiva, corretiva e assim por diante) diz que género de trabalho é. As categorias acrescentam as suas próprias etiquetas, para o que a empresa precisar de distinguir: trabalhos cobertos pela garantia, trabalhos a faturar, chamadas fora de horas, um projeto em particular. Uma ordem de trabalho pode ter várias categorias, ou nenhuma.

Assim que existir pelo menos uma categoria:

- O formulário da ordem de trabalho mostra um campo **Categorias** onde marca as que se aplicam.
- A lista de ordens de trabalho e a página de cada ordem mostram-nas como etiquetas coloridas.
- A lista de ordens de trabalho tem um filtro **Todas as categorias** para mostrar só os trabalhos de uma categoria.

Veja [Ordens de trabalho](/help/work-orders).

## Gerir categorias

Abra **Definições → Categorias**.

1. Em **Nova categoria**, escolha uma cor e escreva o nome (até 40 caracteres).
2. Clique em **Criar**.

Cada categoria existente aparece com o número de ordens de trabalho que a usam. Para mudar o nome ou a cor, edite-a no próprio sítio e clique em **Guardar**. Não pode haver duas categorias com o mesmo nome, independentemente das maiúsculas.

O caixote do lixo elimina uma categoria, depois de uma confirmação. Ela é apenas removida das ordens de trabalho; as ordens ficam como estão.

> Mantenha a lista curta e combine o significado de cada categoria, para que todos etiquetem os trabalhos da mesma forma e o filtro continue útil.

## Quem pode fazer o quê

- **Super Admin**, **Administrador** e **Gestor** podem criar, editar e eliminar categorias.
- Quem pode editar uma ordem de trabalho pode marcar as suas categorias, e todos os que veem ordens de trabalho veem as etiquetas e podem usar o filtro.
`,
};

export default text;
