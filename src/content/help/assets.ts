import type { HelpShot, HelpText } from "@/lib/help";

export const shots: HelpShot[] = [
  { name: "assets-list", path: "/assets", maxHeight: 560 },
  { name: "assets-detail", path: "/assets", open: "Core switch", maxHeight: 1200 },
  { name: "assets-import", path: "/assets/import", maxHeight: 520 },
];

const text: HelpText = {
  en: `# Assets

The equipment installed in your clients' villas: racks, switches, controllers, cameras, amplifiers, distribution boards and so on. Each asset records where it is, what it is, its network details, its status over time, its encrypted credentials and its QR label.

## What assets are for

An asset is one piece of equipment in one villa. Work orders, requests, preventive plans and meters can point to an asset, so its page becomes the equipment's full history: what was done, when it failed, which spare parts fit it. Assets are grouped by **System**: **Electrical**, **Automation**, **Network**, **Security**, **CCTV**, **Audio/Video**, **Lighting** and **Other**.

## The assets list

**Assets** in the menu lists the equipment of all villas, with the system, location (villa and area), model, IP address and **Status**.

![The assets list with filters, and the buttons to print labels, export, import and add](assets-list)

- Search by name, model, serial number, IP or MAC address (asset tag, category and manufacturer work too).
- Filter by villa, system and status, and switch between **Active** and **Archived**.
- **Print QR labels** prints labels for the assets that match the current filters.
- **CSV** downloads the asset register (see below).
- **Import CSV** and **New asset** add equipment.

## Adding an asset

1. Click **New asset**. Starting from a villa page, or from **Add inside** on another asset, fills in the villa or the parent for you.
2. **Location**: choose the **Villa**, then the **Area / room** and, if the asset sits inside another one (a switch inside a rack), the asset it is **Installed in**. Only areas and assets of the chosen villa are offered.
3. **Identification**: the **Name** (for example "Cinema AV receiver"), the **Asset tag** if you put your own tags on equipment, the **System**, the **Category** (suggestions change with the system), **Manufacturer**, **Model** and **Serial number**.
4. **Network**, for IP devices: **IP address**, **MAC address**, **VLAN** and **Firmware**. The IP and MAC are checked for a valid format. A MAC can be typed with colons, dashes or no separators; it is saved as AA:BB:CC:DD:EE:FF.
5. **Status & lifecycle**: **Status**, **Criticality** (**Low**, **Medium**, **High** or **Critical**), **Installed**, **Warranty until**, **Purchase cost**, **Supplier** and **Notes**.
6. Click **Create**.

> Passwords never go in the notes. Save the asset first, then put logins in the encrypted **Device credentials** box on its page.

Moving an asset to another villa keeps its history. Equipment that was installed inside it and stays in the old villa is detached from it.

## Reading the serial number and MAC with the camera

The **Serial number** and **MAC address** fields have a camera button (**Read with the camera**), so you don't have to copy long codes off a label by hand:

1. Tap the camera button in the field and point the camera at the equipment's label.
2. If the value is in a barcode or QR code, it is read straight away and the field is filled in. A code that holds more than the value (for example "S/N: ABC123") is trimmed to the serial number or the MAC.
3. If the value is only printed as text, fit it inside the box and tap **Read text**. The first time, the text reader is prepared (it downloads about 15 MB).
4. The likely values found on the label are listed: tap the right one. If nothing useful is found, hold the camera closer and tap **Try again**.

MAC addresses are always filled in as AA:BB:CC:DD:EE:FF, however they are written on the label. You can still type or correct the value in the field before saving. See [Scan](/help/scan) for the codes the camera reads.

## The asset page

![An asset page: details, network, spare parts and work orders, with status, credentials and QR label on the right](assets-detail)

The top line shows the path client → villa → area → parent asset, each a link. Below the title are the system and status badges. The page then shows:

- The details, with a badge when the warranty **Expired** or expires within 60 days.
- **Network**, when the asset has network details.
- [Meters](/help/meters) attached to the asset, and **Compatible spare parts** (see below).
- **Work orders**: the latest jobs on this asset, and a button to create one.
- **Contains**: the equipment installed inside this asset, with **Add inside**.
- **Status history**: every status change, with who made it, when and the note.
- On the right: **Status**, **Device credentials** and **QR label**.

## Status and status history

The status says whether the equipment works: **Operational**, **Degraded** (working, but not properly), **Down** or **Decommissioned**. Assets that are **Down** or **Degraded** appear under **Needs attention** on their villa page, and the time spent **Down** is counted as downtime in [Reports](/help/reports).

To change it, pick the new status in the **Status** box on the right, optionally write **What happened? (optional)**, and click **Update status**. Every change, including the first status when the asset was created and changes made through **Edit**, is added to the **Status history**.

## Device credentials

**Device credentials** holds logins, passwords and keys for the device. It is stored encrypted and shown masked. Click **Reveal** to read it and **Hide** to mask it again; click **Edit**, type and **Save** to change it. Every reveal and every change is recorded in the audit log with your name and the time, and opening **Edit** on stored credentials also counts as a reveal. Credentials are never included in exports.

## Compatible spare parts

Link the spare parts that fit this asset: choose one in **Link a part…** and click **Add**. Each linked part shows its stock on hand and a low-stock warning. Technicians see these parts first when they log parts used on a work order for this asset. See [Parts](/help/parts).

## QR labels

Every asset has its own QR code, shown in the **QR label** box. Print one with **Print label**, a whole villa with **Print QR labels** on the villa page, or any filtered selection from the assets list (up to 500 at a time). Each label shows the asset name, its system, the villa code, the area, the asset tag and "Scan for service". Click **Print** and use the browser's print dialog; A4 sticker sheets work well.

When the code is scanned, a colleague goes straight to the asset page, a client portal user goes to a new request for this asset, and anyone else gets a short anonymous request form. See [Villas](/help/villas) and [Scan](/help/scan).

## Importing from a CSV file

To bring in an equipment list from a spreadsheet or commissioning document, click **Import CSV**.

![The import page with the file format and the template download](assets-import)

1. Click **Download template** for a file with the right columns and two example rows.
2. Fill in one row per asset. **villa** (the villa's code or name), **name** and **system** are required; columns can be in any order and Portuguese headers work too. Systems and criticality can be written in English or Portuguese.
3. Areas that don't exist yet are created. **parent** must name an asset in the same villa, already registered or earlier in the file.
4. Click **Choose a CSV file**. The file is checked first and nothing is saved yet.
5. If problems are found, each one is listed by row: fix the file and upload it again. Otherwise you see a summary and a sample; confirm with the import button (for example **Import 12 assets**).

A file can hold up to 2000 rows.

## Exporting to CSV

The **CSV** button on the assets list downloads every active asset, with its client, villa, area, parent, identification, network details, status, criticality, dates, purchase cost and supplier. It always exports the whole register, whatever filters are set, and never includes credentials.

## Who can do what

- Everyone in the company can see assets, print labels and export the list.
- **Super Admin**, **Administrator**, **Manager** and **Technician** can create, edit, archive and import assets, change their status, edit credentials and link spare parts (permission **Assets**).
- Revealing credentials needs **See access codes**: by default the same four roles. The Viewer and Accountant only see that credentials exist.
`,
  pt: `# Equipamentos

Os equipamentos instalados nas moradias dos seus clientes: bastidores, switches, controladores, câmaras, amplificadores, quadros elétricos, etc. Cada equipamento regista onde está, o que é, os dados de rede, o estado ao longo do tempo, as credenciais encriptadas e a etiqueta QR.

## Para que servem os equipamentos

Um equipamento é uma peça instalada numa moradia. Ordens de trabalho, pedidos, planos preventivos e contadores podem apontar para um equipamento, por isso a sua página torna-se o histórico completo: o que foi feito, quando avariou, que peças de substituição servem. Os equipamentos agrupam-se por **Sistema**: **Eletricidade**, **Domótica**, **Rede**, **Segurança**, **CCTV**, **Áudio/Vídeo**, **Iluminação** e **Outro**.

## A lista de equipamentos

**Equipamentos** no menu mostra os equipamentos de todas as moradias, com o sistema, a localização (moradia e área), o modelo, o endereço IP e o **Estado**.

![A lista de equipamentos com filtros e os botões para imprimir etiquetas, exportar, importar e acrescentar](assets-list)

- Pesquise pelo nome, modelo, número de série, endereço IP ou MAC (a etiqueta, categoria e fabricante também funcionam).
- Filtre por moradia, sistema e estado, e alterne entre **Ativo** e **Arquivado**.
- **Imprimir etiquetas QR** imprime etiquetas para os equipamentos que correspondem aos filtros atuais.
- **CSV** descarrega o registo de equipamentos (ver abaixo).
- **Importar CSV** e **Novo equipamento** acrescentam equipamentos.

## Adicionar um equipamento

1. Clique em **Novo equipamento**. A partir da página de uma moradia, ou de **Adicionar dentro** noutro equipamento, a moradia ou o equipamento pai já vêm preenchidos.
2. **Localização**: escolha a **Moradia**, depois a **Área / divisão** e, se o equipamento estiver dentro de outro (um switch dentro de um bastidor), o equipamento onde está **Instalado em**. Só aparecem áreas e equipamentos da moradia escolhida.
3. **Identificação**: o **Nome** (por exemplo "Recetor AV do cinema"), a **Etiqueta** se coloca etiquetas próprias nos equipamentos, o **Sistema**, a **Categoria** (as sugestões mudam com o sistema), **Fabricante**, **Modelo** e **Número de série**.
4. **Rede**, para equipamentos IP: **Endereço IP**, **Endereço MAC**, **VLAN** e **Firmware**. O formato do IP e do MAC é verificado. O MAC pode ser escrito com dois pontos, hífenes ou sem separadores; fica guardado como AA:BB:CC:DD:EE:FF.
5. **Estado e ciclo de vida**: **Estado**, **Criticidade** (**Baixa**, **Média**, **Alta** ou **Crítica**), **Instalado em**, **Garantia até**, **Custo de aquisição**, **Fornecedor** e **Notas**.
6. Clique em **Criar**.

> As palavras-passe nunca vão para as notas. Guarde primeiro o equipamento e depois coloque os acessos na caixa encriptada **Credenciais do equipamento**, na sua página.

Mudar um equipamento para outra moradia mantém o histórico. Os equipamentos que estavam instalados dentro dele e ficam na moradia antiga deixam de estar ligados a ele.

## Ler o número de série e o MAC com a câmara

Os campos **Número de série** e **Endereço MAC** têm um botão de câmara (**Ler com a câmara**), para não ter de copiar códigos longos de uma etiqueta à mão:

1. Toque no botão da câmara no campo e aponte a câmara para a etiqueta do equipamento.
2. Se o valor estiver num código de barras ou código QR, é lido de imediato e o campo fica preenchido. Um código que tenha mais do que o valor (por exemplo "S/N: ABC123") é reduzido ao número de série ou ao MAC.
3. Se o valor só estiver impresso em texto, enquadre-o na caixa e toque em **Ler texto**. Da primeira vez, o leitor de texto é preparado (descarrega cerca de 15 MB).
4. Aparecem os valores prováveis encontrados na etiqueta: toque no certo. Se não aparecer nada útil, aproxime a câmara e toque em **Tentar outra vez**.

Os endereços MAC ficam sempre preenchidos como AA:BB:CC:DD:EE:FF, seja qual for a forma como estão escritos na etiqueta. Pode sempre escrever ou corrigir o valor no campo antes de guardar. Veja [Ler código](/help/scan) para os códigos que a câmara lê.

## A página do equipamento

![A página de um equipamento: dados, rede, peças e ordens de trabalho, com estado, credenciais e etiqueta QR à direita](assets-detail)

A linha do topo mostra o caminho cliente → moradia → área → equipamento pai, cada um com ligação. Por baixo do título estão o sistema e o estado. A página mostra depois:

- Os dados, com um aviso quando a garantia está **Expirada** ou expira nos próximos 60 dias.
- **Rede**, quando o equipamento tem dados de rede.
- Os [Contadores](/help/meters) do equipamento e as **Peças de substituição compatíveis** (ver abaixo).
- **Ordens de trabalho**: os últimos trabalhos neste equipamento e um botão para criar um.
- **Contém**: os equipamentos instalados dentro deste, com **Adicionar dentro**.
- **Histórico de estado**: cada mudança de estado, com quem a fez, quando e a nota.
- À direita: **Estado**, **Credenciais do equipamento** e **Etiqueta QR**.

## Estado e histórico de estado

O estado diz se o equipamento funciona: **Operacional**, **Degradado** (funciona, mas não bem), **Avariado** ou **Desativado**. Os equipamentos **Avariados** ou **Degradados** aparecem em **Requer atenção** na página da moradia, e o tempo **Avariado** conta como tempo de paragem nos [Relatórios](/help/reports).

Para o mudar, escolha o novo estado na caixa **Estado** à direita, escreva opcionalmente **O que aconteceu? (opcional)** e clique em **Atualizar estado**. Cada mudança, incluindo o primeiro estado na criação do equipamento e as mudanças feitas em **Editar**, fica no **Histórico de estado**.

## Credenciais do equipamento

As **Credenciais do equipamento** guardam acessos, palavras-passe e chaves do equipamento. Ficam guardadas de forma encriptada e aparecem ocultas. Clique em **Mostrar** para as ler e em **Ocultar** para as voltar a esconder; clique em **Editar**, escreva e **Guardar** para as alterar. Cada visualização e cada alteração ficam registadas no registo de auditoria com o seu nome e a hora, e abrir **Editar** com credenciais guardadas também conta como visualização. As credenciais nunca são incluídas nas exportações.

## Peças de substituição compatíveis

Associe as peças de substituição que servem neste equipamento: escolha uma em **Associar uma peça…** e clique em **Adicionar**. Cada peça associada mostra o stock disponível e um aviso de stock baixo. Os técnicos veem estas peças primeiro quando registam as peças usadas numa ordem de trabalho deste equipamento. Veja [Peças e stock](/help/parts).

## Etiquetas QR

Cada equipamento tem o seu próprio código QR, mostrado na caixa **Etiqueta QR**. Imprima uma com **Imprimir etiqueta**, uma moradia inteira com **Imprimir etiquetas QR** na página da moradia, ou qualquer seleção filtrada a partir da lista de equipamentos (até 500 de cada vez). Cada etiqueta mostra o nome do equipamento, o sistema, o código da moradia, a área, a etiqueta e "Digitalize para assistência". Clique em **Imprimir** e use a janela de impressão do navegador; as folhas de autocolantes A4 funcionam bem.

Quando o código é digitalizado, um colega vai diretamente para a página do equipamento, um utilizador do portal do cliente vai para um novo pedido para este equipamento e qualquer outra pessoa recebe um formulário anónimo curto. Veja [Moradias](/help/villas) e [Ler código](/help/scan).

## Importar de um ficheiro CSV

Para trazer uma lista de equipamentos de uma folha de cálculo ou de um documento de comissionamento, clique em **Importar CSV**.

![A página de importação com o formato do ficheiro e o modelo para descarregar](assets-import)

1. Clique em **Descarregar modelo** para obter um ficheiro com as colunas certas e duas linhas de exemplo.
2. Preencha uma linha por equipamento. **villa** (o código ou o nome da moradia), **name** e **system** são obrigatórias; as colunas podem estar em qualquer ordem e os cabeçalhos em português também funcionam. Os sistemas e a criticidade podem ser escritos em inglês ou em português.
3. As áreas que ainda não existem são criadas. **parent** tem de indicar um equipamento da mesma moradia, já registado ou anterior no ficheiro.
4. Clique em **Escolha um ficheiro CSV**. O ficheiro é verificado primeiro e ainda nada é guardado.
5. Se forem encontrados problemas, cada um aparece com o número da linha: corrija o ficheiro e carregue-o novamente. Caso contrário, vê um resumo e uma amostra; confirme com o botão de importação (por exemplo **Importar 12 equipamentos**).

Um ficheiro pode ter até 2000 linhas.

## Exportar para CSV

O botão **CSV** na lista de equipamentos descarrega todos os equipamentos ativos, com o cliente, moradia, área, equipamento pai, identificação, dados de rede, estado, criticidade, datas, custo de aquisição e fornecedor. Exporta sempre o registo completo, sejam quais forem os filtros, e nunca inclui credenciais.

## Quem pode fazer o quê

- Todas as pessoas da empresa podem ver os equipamentos, imprimir etiquetas e exportar a lista.
- **Super Admin**, **Administrador**, **Gestor** e **Técnico** podem criar, editar, arquivar e importar equipamentos, mudar o estado, editar credenciais e associar peças (permissão **Ativos**).
- Mostrar as credenciais exige **Ver códigos de acesso**: por defeito, as mesmas quatro funções. O Observador e o Contabilista só veem que existem credenciais.
`,
};

export default text;
