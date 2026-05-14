export type Lang = "pt" | "en" | "es";

const t = {
  // Header
  "header.parts": { pt: "Catálogo", en: "Catalog", es: "Catálogo" },
  "header.howItWorks": { pt: "Como funciona", en: "How it works", es: "Cómo funciona" },
  "header.faq": { pt: "Dúvidas", en: "FAQ", es: "Preguntas" },
  "header.contact": { pt: "Falar agora", en: "Talk now", es: "Hablar ahora" },
  "header.subtitle": { pt: "Distribuidor XCMG autorizado", en: "Authorized XCMG distributor", es: "Distribuidor XCMG autorizado" },

  // Hero
  "hero.eyebrow": { pt: "Distribuidor XCMG • Brasil · Venezuela · Guiana", en: "XCMG Distributor • Brazil · Venezuela · Guyana", es: "Distribuidor XCMG • Brasil · Venezuela · Guyana" },
  "hero.title.line1": { pt: "Peça parada", en: "A stopped part", es: "Repuesto parado" },
  "hero.title.line2": { pt: "custa mais que", en: "costs more than", es: "cuesta más que" },
  "hero.title.line3": { pt: "peça errada.", en: "the wrong part.", es: "el repuesto equivocado." },
  "hero.subtitle": { pt: "Estoque real, cotação em 24h e atendimento que entende código, aplicação e compatibilidade. Para operações que não podem esperar o próximo turno.", en: "Real stock, 24h quotes and service that understands part code, application and compatibility. For operations that cannot wait for the next shift.", es: "Stock real, cotización en 24h y atención que entiende código, aplicación y compatibilidad. Para operaciones que no pueden esperar al próximo turno." },
  "hero.title": { pt: "Peças Originais", en: "Original Parts", es: "Repuestos Originales" },
  "hero.search": { pt: "Buscar por código, peça ou modelo de máquina", en: "Search by code, part or machine model", es: "Buscar por código, repuesto o modelo de máquina" },
  "hero.stats": { pt: "peças cadastradas com consulta por disponibilidade", en: "parts indexed with availability-based lookup", es: "repuestos catalogados con consulta por disponibilidad" },
  "hero.cta.primary": { pt: "Ver catálogo", en: "Browse catalog", es: "Ver catálogo" },
  "hero.cta.secondary": { pt: "Falar com consultor", en: "Talk to consultant", es: "Hablar con consultor" },
  "hero.trust.stock": { pt: "Estoque real", en: "Real stock", es: "Stock real" },
  "hero.trust.quote": { pt: "Cotação em 24h", en: "24h quote", es: "Cotización en 24h" },
  "hero.trust.coverage": { pt: "Cobertura BR · VE · GY", en: "BR · VE · GY coverage", es: "Cobertura BR · VE · GY" },
  "cat.mineracao": { pt: "Mineração", en: "Mining", es: "Minería" },
  "cat.linha_amarela": { pt: "Linha Amarela", en: "Construction", es: "Línea Amarilla" },
  "cat.perfuratriz": { pt: "Perfuratriz", en: "Drilling", es: "Perforadora" },
  "cat.guindaste": { pt: "Guindaste", en: "Crane", es: "Grúa" },
  "cat.caminhao_eletrico": { pt: "Caminhão Elétrico", en: "Electric Truck", es: "Camión Eléctrico" },

  // How it works
  "how.eyebrow": { pt: "Como funciona", en: "How it works", es: "Cómo funciona" },
  "how.title": { pt: "Três passos. Sem formulário interminável.", en: "Three steps. No endless form.", es: "Tres pasos. Sin formulario interminable." },
  "how.subtitle": { pt: "Você encontra, monta a lista e o time comercial assume. O fluxo foi desenhado para quem precisa responder ao turno da operação, não ao call center.", en: "You search, build the list, and the commercial team takes over. The flow was designed for whoever has to answer to the shift, not the call center.", es: "Usted encuentra, arma la lista y el equipo comercial asume. El flujo fue diseñado para quien tiene que responder al turno, no al call center." },
  "how.step1.title": { pt: "Busque pela peça", en: "Find the part", es: "Busque el repuesto" },
  "how.step1.desc": { pt: "Código XCMG, descrição ou modelo da máquina. Filtros por segmento e disponibilidade real.", en: "XCMG code, description or machine model. Filter by segment and real availability.", es: "Código XCMG, descripción o modelo de máquina. Filtros por segmento y disponibilidad real." },
  "how.step2.title": { pt: "Monte a lista de cotação", en: "Build the quote list", es: "Arme la lista" },
  "how.step2.desc": { pt: "Adicione quantas peças precisar. Dá para salvar a sessão e continuar depois.", en: "Add as many parts as you need. Save the session and come back later.", es: "Agregue todos los repuestos necesarios. Puede guardar la sesión y continuar después." },
  "how.step3.title": { pt: "Receba a cotação em 24h", en: "Get the quote in 24h", es: "Reciba la cotización en 24h" },
  "how.step3.desc": { pt: "Equipe comercial valida compatibilidade, confirma prazo e negocia condição por volume.", en: "Commercial team validates compatibility, confirms lead time and negotiates volume conditions.", es: "El equipo comercial valida compatibilidad, confirma plazo y negocia condiciones por volumen." },

  // Catalog filters
  "filter.title": { pt: "Filtros", en: "Filters", es: "Filtros" },
  "filter.manufacturer": { pt: "Fabricante", en: "Manufacturer", es: "Fabricante" },
  "filter.allManufacturers": { pt: "Todos os fabricantes", en: "All manufacturers", es: "Todos los fabricantes" },
  "filter.model": { pt: "Modelo de Máquina", en: "Machine Model", es: "Modelo de Máquina" },
  "filter.allModels": { pt: "Todos os modelos", en: "All models", es: "Todos los modelos" },
  "filter.availability": { pt: "Disponibilidade", en: "Availability", es: "Disponibilidad" },
  "filter.all": { pt: "Todos", en: "All", es: "Todos" },
  "filter.readyToShip": { pt: "Pronta Entrega", en: "Ready to Ship", es: "Entrega Inmediata" },
  "filter.onDemand": { pt: "Sob Consulta", en: "On Demand", es: "Bajo Consulta" },
  "filter.clear": { pt: "Limpar Filtros", en: "Clear Filters", es: "Limpiar Filtros" },
  "filter.activeFilters": { pt: "filtros ativos", en: "active filters", es: "filtros activos" },
  "filter.partCategory": { pt: "Tipo de Peça", en: "Part Type", es: "Tipo de Repuesto" },
  "filter.allCategories": { pt: "Todas as categorias", en: "All categories", es: "Todas las categorías" },

  // Part categories
  "pcat.Pneus": { pt: "Pneus", en: "Tires", es: "Neumáticos" },
  "pcat.Filtros": { pt: "Filtros", en: "Filters", es: "Filtros" },
  "pcat.Vedações e Retentores": { pt: "Vedações e Retentores", en: "Seals & Retainers", es: "Sellos y Retenes" },
  "pcat.Motor e Componentes": { pt: "Motor e Componentes", en: "Engine & Components", es: "Motor y Componentes" },
  "pcat.Sistema Hidráulico": { pt: "Sistema Hidráulico", en: "Hydraulic System", es: "Sistema Hidráulico" },
  "pcat.Sistema Elétrico": { pt: "Sistema Elétrico", en: "Electrical System", es: "Sistema Eléctrico" },
  "pcat.Estrutural e Chassi": { pt: "Estrutural e Chassi", en: "Structure & Chassis", es: "Estructura y Chasis" },
  "pcat.Transmissão": { pt: "Transmissão", en: "Transmission", es: "Transmisión" },
  "pcat.Freios": { pt: "Freios", en: "Brakes", es: "Frenos" },
  "pcat.Refrigeração": { pt: "Refrigeração", en: "Cooling", es: "Refrigeración" },
  "pcat.Rolamentos e Buchas": { pt: "Rolamentos e Buchas", en: "Bearings & Bushings", es: "Rodamientos y Bujes" },
  "pcat.Acessórios e Outros": { pt: "Acessórios e Outros", en: "Accessories & Other", es: "Accesorios y Otros" },

  // Sort
  "sort.label": { pt: "Ordenar por", en: "Sort by", es: "Ordenar por" },
  "sort.relevance": { pt: "Relevância", en: "Relevance", es: "Relevancia" },
  "sort.stockDesc": { pt: "Maior estoque", en: "Highest stock", es: "Mayor stock" },
  "sort.nameAsc": { pt: "Nome A-Z", en: "Name A-Z", es: "Nombre A-Z" },
  "sort.newest": { pt: "Mais recentes", en: "Newest", es: "Más recientes" },
  "sort.priceAsc": { pt: "Menor preço", en: "Lowest price", es: "Menor precio" },
  "sort.priceDesc": { pt: "Maior preço", en: "Highest price", es: "Mayor precio" },

  // Catalog
  "catalog.found": { pt: "peças encontradas", en: "parts found", es: "repuestos encontrados" },
  "catalog.searching": { pt: "Buscando peças...", en: "Searching parts...", es: "Buscando repuestos..." },
  "catalog.page": { pt: "Página", en: "Page", es: "Página" },
  "catalog.of": { pt: "de", en: "of", es: "de" },
  "catalog.prev": { pt: "Anterior", en: "Previous", es: "Anterior" },
  "catalog.next": { pt: "Próxima", en: "Next", es: "Siguiente" },

  // Part card
  "part.details": { pt: "Detalhes", en: "Details", es: "Detalles" },
  "part.quote": { pt: "Cotar", en: "Quote", es: "Cotizar" },
  "part.added": { pt: "Adicionado", en: "Added", es: "Agregado" },
  "part.unavailable": { pt: "Indisponível", en: "Unavailable", es: "No disponible" },
  "part.units": { pt: "un.", en: "units", es: "uds." },
  "part.noModel": { pt: "Modelo não especificado", en: "Model not specified", es: "Modelo no especificado" },
  "part.readyToShip": { pt: "Pronta Entrega", en: "Ready to Ship", es: "Entrega Inmediata" },
  "part.lastUnits": { pt: "Últimas unidades!", en: "Last units!", es: "¡Últimas unidades!" },
  "part.aiVerified": { pt: "Verificado por IA", en: "AI Verified", es: "Verificado por IA" },
  "part.priceOnRequest": { pt: "Consultar preço", en: "Price on request", es: "Precio bajo consulta" },
  "part.kitsManutencao": { pt: "Kits de Manutenção", en: "Maintenance Kits", es: "Kits de Mantenimiento" },
  "part.onPromotion": { pt: "Em promoção", en: "On promotion", es: "En promoción" },
  "part.availability": { pt: "Disponibilidade", en: "Availability", es: "Disponibilidad" },

  // Part detail
  "detail.techDesc": { pt: "Descrição Técnica", en: "Technical Description", es: "Descripción Técnica" },
  "detail.function": { pt: "Função Provável", en: "Probable Function", es: "Función Probable" },
  "detail.compatible": { pt: "Máquinas Compatíveis", en: "Compatible Machines", es: "Máquinas Compatibles" },
  "detail.specs": { pt: "Especificações", en: "Specifications", es: "Especificaciones" },
  "detail.similar": { pt: "Peças Similares", en: "Similar Parts", es: "Repuestos Similares" },
  "detail.addToQuote": { pt: "Adicionar à Cotação", en: "Add to Quote", es: "Agregar a Cotización" },
  "detail.alreadyAdded": { pt: "Já adicionado à cotação", en: "Already added to quote", es: "Ya agregado a cotización" },
  "detail.available": { pt: "unidades disponíveis", en: "units available", es: "unidades disponibles" },
  "detail.model": { pt: "Modelo", en: "Model", es: "Modelo" },
  "detail.manufacturer": { pt: "Fabricante", en: "Manufacturer", es: "Fabricante" },
  "detail.aiResearch": { pt: "Pesquisa IA", en: "AI Research", es: "Investigación IA" },

  // Cart
  "cart.title": { pt: "Cotação", en: "Quote", es: "Cotización" },
  "cart.items": { pt: "itens", en: "items", es: "artículos" },
  "cart.empty": { pt: "Nenhum item adicionado. Busque peças e adicione à cotação.", en: "No items added. Search parts and add to quote.", es: "No hay artículos. Busque repuestos y agregue a la cotización." },
  "cart.submit": { pt: "Solicitar Cotação", en: "Request Quote", es: "Solicitar Cotización" },
  "cart.sending": { pt: "Enviando...", en: "Sending...", es: "Enviando..." },
  "cart.send": { pt: "Enviar Cotação", en: "Send Quote", es: "Enviar Cotización" },
  "cart.back": { pt: "Voltar", en: "Back", es: "Volver" },
  "cart.sent": { pt: "Cotação Enviada!", en: "Quote Sent!", es: "¡Cotización Enviada!" },
  "cart.sentDesc": { pt: "Nossa equipe entrará em contato em breve.", en: "Our team will contact you soon.", es: "Nuestro equipo le contactará pronto." },
  "cart.new": { pt: "Nova Cotação", en: "New Quote", es: "Nueva Cotización" },
  "cart.name": { pt: "Nome", en: "Name", es: "Nombre" },
  "cart.company": { pt: "Empresa", en: "Company", es: "Empresa" },
  "cart.email": { pt: "Email", en: "Email", es: "Email" },
  "cart.phone": { pt: "Telefone", en: "Phone", es: "Teléfono" },
  "cart.notes": { pt: "Observações", en: "Notes", es: "Observaciones" },
  "cart.error": { pt: "Preencha nome, email e adicione ao menos 1 peça", en: "Fill name, email and add at least 1 part", es: "Complete nombre, email y agregue al menos 1 repuesto" },
  "cart.errorSend": { pt: "Erro ao enviar cotação", en: "Error sending quote", es: "Error al enviar cotización" },

  // FAQ
  "faq.title": { pt: "Perguntas Frequentes", en: "Frequently Asked Questions", es: "Preguntas Frecuentes" },
  "faq.subtitle": { pt: "Tire suas dúvidas sobre peças, entregas e pagamentos", en: "Get answers about parts, deliveries and payments", es: "Resuelva sus dudas sobre repuestos, entregas y pagos" },
  "faq.specialist": { pt: "Fale com um Especialista", en: "Talk to a Specialist", es: "Hable con un Especialista" },
  "faq.q1": { pt: "Qual o prazo de entrega das peças?", en: "What is the delivery time?", es: "¿Cuál es el plazo de entrega?" },
  "faq.a1": { pt: "Para peças em estoque, o prazo de envio é de 1 a 3 dias úteis. Para peças sob encomenda, o prazo varia de 15 a 45 dias conforme a origem.", en: "For in-stock parts, shipping time is 1-3 business days. For made-to-order parts, lead time varies from 15-45 days depending on origin.", es: "Para repuestos en stock, el plazo de envío es de 1 a 3 días hábiles. Para repuestos bajo pedido, el plazo varía de 15 a 45 días según el origen." },
  "faq.q2": { pt: "As peças possuem garantia?", en: "Do parts have warranty?", es: "¿Los repuestos tienen garantía?" },
  "faq.a2": { pt: "Sim. Todas as peças originais XCMG possuem garantia de fábrica. O prazo de garantia varia conforme o tipo de peça e aplicação.", en: "Yes. All original XCMG parts have factory warranty. Warranty period varies by part type and application.", es: "Sí. Todos los repuestos originales XCMG tienen garantía de fábrica. El plazo de garantía varía según el tipo de repuesto y aplicación." },
  "faq.q3": { pt: "Como faço para rastrear meu pedido?", en: "How can I track my order?", es: "¿Cómo puedo rastrear mi pedido?" },
  "faq.a3": { pt: "Após a confirmação do pedido, você receberá um código de rastreamento por e-mail. Também é possível acompanhar pelo WhatsApp com nosso atendimento.", en: "After order confirmation, you'll receive a tracking code by email. You can also track via WhatsApp with our support team.", es: "Después de la confirmación del pedido, recibirá un código de rastreo por email. También puede seguirlo por WhatsApp con nuestro equipo." },
  "faq.q4": { pt: "Vocês atendem fora do Brasil?", en: "Do you serve outside Brazil?", es: "¿Atienden fuera de Brasil?" },
  "faq.a4": { pt: "Sim! Atendemos Venezuela, Guiana e outros países da América Latina. Entre em contato para cotação com frete internacional.", en: "Yes! We serve Venezuela, Guyana and other Latin American countries. Contact us for international shipping quotes.", es: "¡Sí! Atendemos Venezuela, Guyana y otros países de América Latina. Contáctenos para cotización con flete internacional." },
  "faq.q5": { pt: "Quais formas de pagamento são aceitas?", en: "What payment methods are accepted?", es: "¿Qué formas de pago aceptan?" },
  "faq.a5": { pt: "Aceitamos boleto bancário, transferência/PIX, e cartão de crédito (parcelamento sob consulta). Para exportação, trabalhamos com carta de crédito e TT.", en: "We accept bank slip, wire transfer/PIX, and credit card (installments upon request). For exports, we work with letter of credit and TT.", es: "Aceptamos transferencia bancaria, PIX y tarjeta de crédito (cuotas bajo consulta). Para exportación, trabajamos con carta de crédito y TT." },
  "faq.q6": { pt: "Como sei se a peça é compatível com minha máquina?", en: "How do I know if the part is compatible with my machine?", es: "¿Cómo sé si el repuesto es compatible con mi máquina?" },
  "faq.a6": { pt: "Nosso sistema possui pesquisa de compatibilidade por IA. Ao consultar uma peça, você verá os modelos compatíveis. Em caso de dúvida, fale com nossos especialistas.", en: "Our system has AI-powered compatibility search. When viewing a part, you'll see compatible models. If in doubt, talk to our specialists.", es: "Nuestro sistema tiene búsqueda de compatibilidad con IA. Al consultar un repuesto, verá los modelos compatibles. En caso de duda, hable con nuestros especialistas." },

  // Footer
  "footer.about": { pt: "Ásia Peças & Máquinas — Distribuidor autorizado de peças originais XCMG. Atuamos no Brasil, Venezuela e Guiana, fornecendo peças para mineração, construção, perfuração, guindastes e caminhões elétricos.", en: "Ásia Peças & Máquinas — Authorized distributor of original XCMG parts. We operate in Brazil, Venezuela and Guyana, supplying parts for mining, construction, drilling, cranes and electric trucks.", es: "Ásia Peças & Máquinas — Distribuidor autorizado de repuestos originales XCMG. Operamos en Brasil, Venezuela y Guyana, suministrando repuestos para minería, construcción, perforación, grúas y camiones eléctricos." },
  "footer.segments": { pt: "Segmentos", en: "Segments", es: "Segmentos" },
  "footer.contact": { pt: "Contato", en: "Contact", es: "Contacto" },
  "footer.internalArea": { pt: "Área Interna", en: "Internal Area", es: "Área Interna" },
  "footer.collaboratorArea": { pt: "Área do Colaborador", en: "Collaborator Area", es: "Área del Colaborador" },
  "footer.rights": { pt: "Todos os direitos reservados", en: "All rights reserved", es: "Todos los derechos reservados" },
  "footer.mining": { pt: "Mineração", en: "Mining", es: "Minería" },
  "footer.construction": { pt: "Linha Amarela (Construção)", en: "Construction Equipment", es: "Línea Amarilla (Construcción)" },
  "footer.drilling": { pt: "Perfuratriz", en: "Drilling Rig", es: "Perforadora" },
  "footer.crane": { pt: "Guindaste", en: "Crane", es: "Grúa" },
  "footer.eTruck": { pt: "Caminhão Elétrico", en: "Electric Truck", es: "Camión Eléctrico" },

  // Benefits ("Por que a Ásia")
  "why.eyebrow": { pt: "Por que a Ásia", en: "Why Ásia", es: "Por qué Ásia" },
  "why.title": { pt: "A máquina não espera. O seu fornecedor também não deveria.", en: "The machine does not wait. Your supplier shouldn't either.", es: "La máquina no espera. Su proveedor tampoco debería." },
  "why.subtitle": { pt: "Somos distribuidor XCMG focado em venda técnica, não em site bonito. Cada camada da nossa operação existe para encurtar o tempo entre a peça faltando e a peça rodando.", en: "We are an XCMG distributor focused on technical sales — not on a pretty site. Every layer of our operation exists to shorten the time between a missing part and a running machine.", es: "Somos distribuidor XCMG enfocado en venta técnica, no en sitio bonito. Cada capa existe para acortar el tiempo entre el repuesto faltante y la máquina funcionando." },
  "why.b1.title": { pt: "Estoque real, não promessa", en: "Real stock, not a promise", es: "Stock real, no una promesa" },
  "why.b1.desc": { pt: "Você vê o que tem disponível hoje — com código, quantidade e origem. Fim do vai-e-volta de e-mail pedindo confirmação.", en: "You see what's available today — with code, quantity and origin. End of the email ping-pong asking for confirmation.", es: "Usted ve lo que hay hoy — con código, cantidad y origen. Fin del ida y vuelta por email." },
  "why.b2.title": { pt: "Cotação em até 24 horas", en: "Quote within 24 hours", es: "Cotización en hasta 24 horas" },
  "why.b2.desc": { pt: "Lista entrou, cotação sai. Sem intermediário, sem roteiro de call center, sem \"vou verificar e retorno\".", en: "List in, quote out. No middleman, no call-center script, no \"let me check and get back to you\".", es: "Lista entra, cotización sale. Sin intermediarios, sin guion de call center." },
  "why.b3.title": { pt: "Venda técnica por código", en: "Technical sales by part code", es: "Venta técnica por código" },
  "why.b3.desc": { pt: "Atendimento por código XCMG, aplicação e compatibilidade — reduzindo erro de especificação e retrabalho.", en: "Service by XCMG code, application and compatibility — cutting specification errors and rework.", es: "Atención por código XCMG, aplicación y compatibilidad — reduciendo errores de especificación." },
  "why.b4.title": { pt: "Condição para quem compra sempre", en: "Terms for recurring buyers", es: "Condiciones para quien compra siempre" },
  "why.b4.desc": { pt: "Frota, obra e revenda têm atendimento corporativo, contrato e negociação por volume desde a primeira lista.", en: "Fleet, jobsite and resale get corporate service, contracts and volume pricing from the first list.", es: "Flota, obra y reventa tienen atención corporativa, contrato y volumen desde la primera lista." },

  // Segments
  "seg.eyebrow": { pt: "Segmentos atendidos", en: "Segments we serve", es: "Segmentos atendidos" },
  "seg.title": { pt: "Atendemos operações que medem parada por hora, não por dia.", en: "We serve operations that measure downtime by the hour — not the day.", es: "Atendemos operaciones que miden parada por hora, no por día." },
  "seg.mining.title": { pt: "Mineração", en: "Mining", es: "Minería" },
  "seg.mining.desc": { pt: "Reposição para operações com SLA de disponibilidade alto e logística crítica.", en: "Replacement for operations with high uptime SLA and critical logistics.", es: "Reposición para operaciones con SLA alto y logística crítica." },
  "seg.yellow.title": { pt: "Linha amarela", en: "Construction equipment", es: "Línea amarilla" },
  "seg.yellow.desc": { pt: "Manutenção programada, peça de campo e reposição de itens de desgaste.", en: "Scheduled maintenance, field parts and wear-item replacement.", es: "Mantenimiento programado, repuesto de campo y desgaste." },
  "seg.drilling.title": { pt: "Perfuração", en: "Drilling", es: "Perforación" },
  "seg.drilling.desc": { pt: "Especificação correta para equipamentos que não aceitam aproximação.", en: "Correct specification for equipment that doesn't accept approximations.", es: "Especificación correcta para equipos que no aceptan aproximaciones." },
  "seg.lifting.title": { pt: "Guindastes e içamento", en: "Cranes & lifting", es: "Grúas e izaje" },
  "seg.lifting.desc": { pt: "Suporte para itens estruturais, hidráulicos e de operação segura.", en: "Support for structural, hydraulic and safety-critical operating items.", es: "Soporte para ítems estructurales, hidráulicos y operativos críticos." },
  "seg.truck.title": { pt: "Caminhões elétricos", en: "Electric trucks", es: "Camiones eléctricos" },
  "seg.truck.desc": { pt: "Reposição e suporte técnico para frota de transporte pesado XCMG.", en: "Replacement and technical support for XCMG heavy-haul fleets.", es: "Reposición y soporte técnico para flota pesada XCMG." },

  // Proof bar
  "proof.response": { pt: "prazo-alvo de resposta comercial", en: "target commercial response time", es: "plazo objetivo de respuesta comercial" },
  "proof.countries": { pt: "países atendidos na América do Sul", en: "countries served across South America", es: "países atendidos en América del Sur" },
  "proof.parts": { pt: "peças XCMG cadastradas no catálogo", en: "XCMG parts indexed in the catalog", es: "repuestos XCMG catalogados" },
  "proof.b2b": { pt: "atendimento dedicado para frota, obra e revenda", en: "dedicated service for fleet, jobsite and resale", es: "atención dedicada para flota, obra y reventa" },

  // B2B strip
  "b2b.title": { pt: "Compra para frota, manutenção ou revenda?", en: "Buying for fleet, maintenance or resale?", es: "¿Compra para flota, mantenimiento o reventa?" },
  "b2b.desc": { pt: "Condição corporativa, contrato de fornecimento e consultor dedicado desde o primeiro pedido.", en: "Corporate terms, supply contracts and a dedicated consultant from the first order.", es: "Condición corporativa, contrato de suministro y consultor dedicado desde el primer pedido." },
  "b2b.cta": { pt: "Falar com consultor", en: "Talk to consultant", es: "Hablar con consultor" },

  // Final CTA
  "final.eyebrow": { pt: "Sua próxima cotação", en: "Your next quote", es: "Su próxima cotización" },
  "final.title": { pt: "Está com lista em mãos? Mande agora.", en: "Got a list in hand? Send it now.", es: "¿Tiene la lista lista? Envíela ahora." },
  "final.subtitle": { pt: "Monte seu pedido no catálogo ou fale direto com o comercial. Os dois caminhos chegam na mesma mesa — a que resolve.", en: "Build your order in the catalog or talk straight to the commercial team. Both paths reach the same desk — the one that solves it.", es: "Arme su pedido en el catálogo o hable directo con comercial. Los dos caminos llegan a la misma mesa — la que resuelve." },
  "final.primary": { pt: "Explorar catálogo", en: "Browse catalog", es: "Explorar catálogo" },
  "final.secondary": { pt: "Falar com consultor", en: "Talk to consultant", es: "Hablar con consultor" },

  // Chat
  "chat.greeting": { pt: "Olá! Sou o assistente da Ásia Peças & Máquinas. Como posso ajudar? Posso tirar dúvidas sobre peças, compatibilidade de máquinas e prazos.", en: "Hello! I'm the Ásia Peças & Máquinas assistant. How can I help? I can answer questions about parts, machine compatibility and lead times.", es: "¡Hola! Soy el asistente de Ásia Peças & Máquinas. ¿Cómo puedo ayudar? Puedo resolver dudas sobre repuestos, compatibilidad de máquinas y plazos." },
  "chat.placeholder": { pt: "Pergunte sobre peças, modelos...", en: "Ask about parts, models...", es: "Pregunte sobre repuestos, modelos..." },
  "chat.title": { pt: "Assistente Ásia Peças", en: "Ásia Peças Assistant", es: "Asistente Ásia Peças" },
  "chat.typing": { pt: "Digitando...", en: "Typing...", es: "Escribiendo..." },
  "chat.error": { pt: "Erro ao conectar. Tente novamente ou fale conosco pelo WhatsApp.", en: "Connection error. Try again or contact us via WhatsApp.", es: "Error de conexión. Intente de nuevo o contáctenos por WhatsApp." },
  "chat.noResponse": { pt: "Desculpe, não consegui processar sua pergunta. Tente novamente.", en: "Sorry, I couldn't process your question. Try again.", es: "Disculpe, no pude procesar su pregunta. Intente de nuevo." },
} as const;

export type TKey = keyof typeof t;

export function tr(key: TKey, lang: Lang): string {
  return t[key]?.[lang] ?? t[key]?.["pt"] ?? key;
}
