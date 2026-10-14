import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [{ name: "vendors-detail", path: "/vendors", open: "Redes Lusas Distribuição", maxHeight: 720 }];

const text: HelpText = {
  en: `# Vendors

The suppliers, subcontractors and manufacturers you buy parts and equipment from, with their contacts and what they supply.

## What vendors are for

A vendor is who you buy from. Every purchase order goes to a vendor, each part can have a preferred vendor (the one automatic reorders go to), and each asset can record who supplied it. Keeping vendors here puts their details, contacts, parts and orders in one place.

## The list

The list shows each vendor with their email and phone, **Type**, **Systems supplied**, and how many parts and purchase orders they have. Search by name, email or phone, filter by type (**Supplier**, **Subcontractor** or **Manufacturer**) or by system, or switch to **Archived**.

## Adding a vendor

1. Click **New vendor**.
2. Enter the **Name** and choose the **Type**.
3. Fill in **Email**, **Phone**, **Tax ID**, **Website** and **Address** as needed. The email and phone are shown on the purchase orders you send them.
4. Tick the **Systems supplied**, so the vendor appears when you filter by system.
5. Add any **Notes** and click **Create**.

## The vendor's page

![A vendor's page with its parts, purchase orders and contacts](vendors-detail)

- **Parts (preferred vendor)**: the parts that list this vendor as preferred, with their stock and a **Low stock** badge where needed. **New part** creates a part with this vendor already chosen.
- **Purchase orders**: the latest ten orders to this vendor, and **New purchase order** to start one for them.
- **Equipment supplied**: assets that record this vendor as their supplier.
- **Contacts**: the people you deal with. Use **Add contact** for each one, with their **Role** (for example account manager or technical support), phone and email.

Use **Edit** to change the details, and **Archive** for a vendor you no longer use: their history and past orders stay, and **Restore** brings them back.

> A vendor's preferred parts are what [Reorder low stock](/help/parts) groups into one draft order. Parts without a preferred vendor are left out of automatic reorders, so set it on every part you buy regularly.

## Who can do what

- Everyone in the company (except clients) can see vendors, their parts and contacts.
- **Super Admin**, **Administrator** and **Manager** add, edit and archive vendors and their contacts.
- The **Purchase orders** section is only shown to people who handle purchasing; see [Purchase orders](/help/purchase-orders).
`,
  pt: `# Fornecedores

Os fornecedores, subempreiteiros e fabricantes a quem compra peças e equipamento, com os seus contactos e o que fornecem.

## Para que servem os fornecedores

Um fornecedor é a quem compra. Cada nota de encomenda é enviada a um fornecedor, cada peça pode ter um fornecedor preferencial (aquele a quem vão as reposições automáticas) e cada equipamento pode registar quem o forneceu. Ter os fornecedores aqui junta num só sítio os seus dados, contactos, peças e encomendas.

## A lista

A lista mostra cada fornecedor com o email e o telefone, o **Tipo**, os **Sistemas fornecidos** e quantas peças e notas de encomenda tem. Pesquise por nome, email ou telefone, filtre por tipo (**Fornecedor**, **Subempreiteiro** ou **Fabricante**) ou por sistema, ou mude para **Arquivado**.

## Adicionar um fornecedor

1. Clique em **Novo fornecedor**.
2. Indique o **Nome** e escolha o **Tipo**.
3. Preencha **Email**, **Telefone**, **NIF**, **Website** e **Morada** conforme necessário. O email e o telefone aparecem nas notas de encomenda que lhe envia.
4. Marque os **Sistemas fornecidos**, para que o fornecedor apareça quando filtrar por sistema.
5. Acrescente **Notas** se quiser e clique em **Criar**.

## A página do fornecedor

![A página de um fornecedor com as suas peças, encomendas e contactos](vendors-detail)

- **Peças (fornecedor preferencial)**: as peças que têm este fornecedor como preferencial, com o stock e o indicador **Stock baixo** quando é o caso. **Nova peça** cria uma peça já com este fornecedor escolhido.
- **Encomendas**: as últimas dez notas de encomenda a este fornecedor, e **Nova nota de encomenda** para começar uma.
- **Equipamento fornecido**: os equipamentos que registam este fornecedor como origem.
- **Contactos**: as pessoas com quem trata. Use **Adicionar contacto** para cada uma, com a **Função** (por exemplo gestor de conta ou apoio técnico), telefone e email.

Use **Editar** para alterar os dados e **Arquivar** para um fornecedor que já não usa: o histórico e as encomendas antigas ficam, e **Restaurar** volta a ativá-lo.

> As peças com este fornecedor como preferencial são as que [Repor stock baixo](/help/parts) junta num rascunho de encomenda. As peças sem fornecedor preferencial ficam de fora das reposições automáticas, por isso defina-o em todas as peças que compra com regularidade.

## Quem pode fazer o quê

- Todos na empresa (exceto clientes) podem ver os fornecedores, as suas peças e contactos.
- **Super Admin**, **Administrador** e **Gestor** adicionam, editam e arquivam fornecedores e os seus contactos.
- A secção **Encomendas** só aparece a quem trata das compras; veja [Encomendas](/help/purchase-orders).
`,
};

export default text;
