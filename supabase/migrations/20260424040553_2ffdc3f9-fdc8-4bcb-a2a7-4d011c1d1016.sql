
-- Tabela taxonomia mestre
CREATE TABLE IF NOT EXISTS public.subcategory_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory text NOT NULL UNIQUE,
  category_group text NOT NULL,
  synonyms_pt text[] NOT NULL DEFAULT '{}',
  synonyms_en text[] NOT NULL DEFAULT '{}',
  synonyms_es text[] NOT NULL DEFAULT '{}',
  negative_terms text[] NOT NULL DEFAULT '{}',
  attribute_extractors jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority int NOT NULL DEFAULT 100,
  min_score numeric NOT NULL DEFAULT 0.4,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subcategory_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read taxonomy" ON public.subcategory_taxonomy
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated insert taxonomy" ON public.subcategory_taxonomy
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update taxonomy" ON public.subcategory_taxonomy
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins delete taxonomy" ON public.subcategory_taxonomy
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_taxonomy_updated_at
  BEFORE UPDATE ON public.subcategory_taxonomy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feedback de classificação (humano corrige -> vira sinônimo)
CREATE TABLE IF NOT EXISTS public.taxonomy_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES public.parts(id) ON DELETE CASCADE,
  original_subcategory text,
  corrected_subcategory text NOT NULL,
  description_snapshot text,
  user_id uuid,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.taxonomy_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read feedback" ON public.taxonomy_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert feedback" ON public.taxonomy_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update feedback" ON public.taxonomy_feedback
  FOR UPDATE TO authenticated USING (true);

-- Colunas em parts
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification_method text;

CREATE INDEX IF NOT EXISTS idx_parts_needs_review ON public.parts(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_parts_subcategory ON public.parts(subcategory);

-- Seed da taxonomia
INSERT INTO public.subcategory_taxonomy (subcategory, category_group, synonyms_pt, synonyms_en, synonyms_es, negative_terms, attribute_extractors, priority) VALUES
('Pneus','Rodante',
 ARRAY['pneu','pneumatico','pneumático'],
 ARRAY['tire','tyre'],
 ARRAY['llanta','neumatico','neumático'],
 ARRAY['camara','câmara','protetor','calota'],
 '{"medida_radial":"\\m(\\d{2}\\.\\d|\\d{2})\\s?[rR]\\s?(\\d{2})\\M","medida_diagonal":"\\m(\\d{1,2}\\.\\d{1,2})\\s?-\\s?(\\d{2})\\M","medida_metric":"\\m(\\d{3})/(\\d{2,3})\\s?[rR]\\s?(\\d{2})\\M","tipo":"(?i)(radial|diagonal|otr)"}'::jsonb, 10),

('Filtros','Consumíveis',
 ARRAY['filtro'],
 ARRAY['filter'],
 ARRAY['filtre','filtro'],
 ARRAY[]::text[],
 '{"fluido_oleo":"(?i)(oleo|óleo|\\moil\\M|aceite)","fluido_combustivel":"(?i)(combust|fuel|diesel|gasolina)","fluido_hidraulico":"(?i)(hidr|hydraulic)","fluido_cabine":"(?i)(cabine|cabin)","fluido_ar":"(?i)\\m(ar|air|aire)\\M","fluido_separador":"(?i)(separador|water sep)","codigo_oem":"\\m([A-Z]{1,3}[-]?\\d{4,8})\\M"}'::jsonb, 20),

('Rolamentos','Transmissão',
 ARRAY['rolamento','mancal'],
 ARRAY['bearing'],
 ARRAY['cojinete','rodamiento'],
 ARRAY[]::text[],
 '{"codigo_serie":"\\m(6\\d{3,4}|3\\d{4}|2\\d{4}|7\\d{4}|N\\d{3,4}|NU\\d{3,4})\\M","tipo_esferico":"(?i)(esferico|esférico|ball)","tipo_conico":"(?i)(conico|cônico|tapered)","tipo_rolo":"(?i)(rolo|roller)"}'::jsonb, 15),

('Mangueiras e Tubos','Hidráulico',
 ARRAY['mangueira','tubo flex','conexao hidraulica','conexão hidráulica'],
 ARRAY['hose','hydraulic tube'],
 ARRAY['manguera'],
 ARRAY[]::text[],
 '{"diametro":"\\m(\\d{1,2}/\\d{1,2}|\\d{1,3})\\s?(mm|pol|\")","comprimento":"\\m(\\d{2,4})\\s?(mm|cm|m)\\M","pressao":"\\m(\\d{2,4})\\s?(bar|psi)\\M"}'::jsonb, 30),

('Cilindros Hidráulicos','Hidráulico',
 ARRAY['cilindro hidraulico','cilindro hidráulico','cilindro de levantamento','cilindro da lanca','cilindro da lança','cilindro do braco','cilindro do braço','cilindro cacamba','cilindro caçamba'],
 ARRAY['hydraulic cylinder','lift cylinder','boom cylinder','arm cylinder','bucket cylinder'],
 ARRAY['cilindro hidraulico'],
 ARRAY[]::text[],
 '{"posicao_lanca":"(?i)(lanca|lança|boom)","posicao_braco":"(?i)(braco|braço|arm|stick)","posicao_cacamba":"(?i)(cacamba|caçamba|bucket)","curso":"\\m(\\d{3,4})\\s?mm"}'::jsonb, 15),

('Bombas','Hidráulico',
 ARRAY['bomba'],
 ARRAY['pump'],
 ARRAY['bomba'],
 ARRAY[]::text[],
 '{"tipo_hidraulica":"(?i)(hidr|hydra)","tipo_oleo":"(?i)(oleo|óleo|oil)","tipo_combustivel":"(?i)(combust|fuel)","tipo_agua":"(?i)(agua|água|water)"}'::jsonb, 40),

('Vedações e Retentores','Hidráulico',
 ARRAY['vedacao','vedação','retentor','o-ring','oring','junta','anel de borracha','reparo'],
 ARRAY['seal','o-ring','gasket'],
 ARRAY['empaque','reten','sello'],
 ARRAY[]::text[],
 '{"tipo_oring":"(?i)(o[- ]?ring)","tipo_retentor":"(?i)(retentor|seal)","tipo_junta":"(?i)(junta|gasket)","medida":"\\m(\\d{1,3})\\s?[xX]\\s?(\\d{1,3})"}'::jsonb, 25),

('Correias e Polias','Motor',
 ARRAY['correia','polia'],
 ARRAY['belt','pulley'],
 ARRAY['correa','polea'],
 ARRAY[]::text[],
 '{"codigo":"\\m([A-Z]{1,2}\\d{3,5})\\M","comprimento":"\\m(\\d{3,4})\\s?mm"}'::jsonb, 35),

('Faróis e Iluminação','Elétrico',
 ARRAY['farol','farois','faróis','luz de trabalho','luminaria','luminária','lanterna','lampada','lâmpada'],
 ARRAY['headlight','headlamp','work light','bulb','lamp'],
 ARRAY['faro','luz'],
 ARRAY[]::text[],
 '{"tipo_led":"(?i)\\mled\\M","tipo_halogeno":"(?i)(halog|xenon)","posicao_dianteiro":"(?i)(diant|front|delant)","posicao_traseiro":"(?i)(tras|rear)","posicao_trabalho":"(?i)(trabalho|work)","tensao":"\\m(12|24)\\s?[vV]\\M"}'::jsonb, 30),

('Baterias','Elétrico',
 ARRAY['bateria'],
 ARRAY['battery'],
 ARRAY['bateria','batería'],
 ARRAY[]::text[],
 '{"tensao":"\\m(12|24)\\s?[vV]\\M","amperagem":"\\m(\\d{2,4})\\s?[Aa][Hh]"}'::jsonb, 20),

('Material Rodante','Rodante',
 ARRAY['rolete','esteira','sapata','elo de esteira','sprocket','coroa de esteira','guia de esteira','roda guia'],
 ARRAY['roller','track','idler','sprocket','track shoe'],
 ARRAY[]::text[],
 ARRAY['pneu','tire'],
 '{"tipo_rolete":"(?i)\\m(rolete|roller)\\M","tipo_sapata":"(?i)(sapata|shoe)","tipo_elo":"(?i)(elo|link)","tipo_sprocket":"(?i)(sprocket|coroa)","passo":"\\m(\\d{3})\\s?mm"}'::jsonb, 15),

('Engrenagens','Transmissão',
 ARRAY['engrenagem','pinhao','pinhão','cremalheira','coroa'],
 ARRAY['gear','planet'],
 ARRAY['engranaje'],
 ARRAY['esteira'],
 '{"dentes":"\\m(\\d{2,3})\\s?(d|dentes|teeth)"}'::jsonb, 35),

('Eixos e Cardans','Transmissão',
 ARRAY['eixo','cardan','semi-eixo','semi eixo','volante','flywheel'],
 ARRAY['shaft','axle','driveshaft'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{"comprimento":"\\m(\\d{3,4})\\s?mm"}'::jsonb, 40),

('Sensores','Elétrico',
 ARRAY['sensor','sonda','chave de pressao','chave de pressão','interruptor de pressao','interruptor de pressão'],
 ARRAY['sensor','sender','switch'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{"grandeza_pressao":"(?i)(pressao|pressão|pressure)","grandeza_temp":"(?i)(temp|temperat)","grandeza_rotacao":"(?i)(rotac|rotação|rpm|speed)","grandeza_nivel":"(?i)(nivel|nível|level)"}'::jsonb, 30),

('Válvulas','Hidráulico',
 ARRAY['valvula','válvula'],
 ARRAY['valve'],
 ARRAY['valvula','válvula'],
 ARRAY[]::text[],
 '{"tipo_alivio":"(?i)(alivio|alívio|relief)","tipo_direcional":"(?i)(direcional|directional)","tipo_retencao":"(?i)(retenc|check)","tipo_solenoide":"(?i)(solenoid)","pressao":"\\m(\\d{2,4})\\s?(bar|psi)"}'::jsonb, 35),

('Injetores e Bicos','Motor',
 ARRAY['injetor','bico injetor','bico de injeção','solenoide injetor'],
 ARRAY['injector','injection nozzle'],
 ARRAY['inyector'],
 ARRAY[]::text[],
 '{}'::jsonb, 25),

('Turbinas','Motor',
 ARRAY['turbo','turbina','turbocompressor'],
 ARRAY['turbo','turbocharger'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{}'::jsonb, 20),

('Alternadores','Elétrico',
 ARRAY['alternador'],
 ARRAY['alternator'],
 ARRAY['alternador'],
 ARRAY[]::text[],
 '{"tensao":"\\m(12|24)\\s?[vV]\\M","amperagem":"\\m(\\d{2,3})\\s?[Aa]\\M"}'::jsonb, 25),

('Motor de Partida','Elétrico',
 ARRAY['motor de partida','arranque'],
 ARRAY['starter','starter motor'],
 ARRAY['arranque','motor de arranque'],
 ARRAY[]::text[],
 '{"tensao":"\\m(12|24)\\s?[vV]\\M"}'::jsonb, 25),

('Radiadores e Arrefecimento','Motor',
 ARRAY['radiador','intercooler','trocador de calor','reservatorio de expansao','reservatório de expansão','tanque de agua','tanque de água','ventoinha','ventilador','coletor de escape','silencioso','escapamento'],
 ARRAY['radiator','intercooler','fan','exhaust','muffler'],
 ARRAY['radiador'],
 ARRAY[]::text[],
 '{}'::jsonb, 35),

('Chicotes Elétricos','Elétrico',
 ARRAY['chicote','cabo eletrico','cabo elétrico','fio eletrico','fio elétrico'],
 ARRAY['harness','wiring','cable assembly'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{}'::jsonb, 40),

('Freios e Embreagem','Transmissão',
 ARRAY['disco de freio','pastilha','lona de freio','freio','disco','embreagem'],
 ARRAY['brake','disc','pad','clutch'],
 ARRAY['freno','embrague'],
 ARRAY[]::text[],
 '{"componente_disco":"(?i)\\m(disco|disc)\\M","componente_pastilha":"(?i)(pastilha|pad)","componente_lona":"(?i)(lona|shoe)","componente_embreagem":"(?i)(embreagem|clutch)"}'::jsonb, 25),

('Amortecedores','Cabine',
 ARRAY['amortecedor'],
 ARRAY['shock absorber','absorber'],
 ARRAY['amortiguador'],
 ARRAY[]::text[],
 '{}'::jsonb, 30),

('Implementos de Solo','Rodante',
 ARRAY['lamina','lâmina','dente de cacamba','dente de caçamba','cacamba','caçamba','cantoneira','adaptador de dente','adaptador'],
 ARRAY['blade','tooth','bucket','cutting edge'],
 ARRAY['cuchilla'],
 ARRAY[]::text[],
 '{"tipo_dente":"(?i)(dente|tooth)","tipo_lamina":"(?i)(lamina|lâmina|blade)","tipo_cacamba":"(?i)(cacamba|caçamba|bucket)","tipo_cantoneira":"(?i)(cantoneira|edge)"}'::jsonb, 20),

('Cabine e Vidros','Cabine',
 ARRAY['cabine','vidro','para-brisa','parabrisa','porta da cabine','tampa'],
 ARRAY['cabin','glass','windshield','door'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{}'::jsonb, 50),

('Bancos','Cabine',
 ARRAY['banco','assento'],
 ARRAY['seat'],
 ARRAY['asiento'],
 ARRAY[]::text[],
 '{}'::jsonb, 30),

('Retrovisores','Cabine',
 ARRAY['retrovisor','espelho retrovisor','espelho'],
 ARRAY['mirror','rearview mirror'],
 ARRAY['espejo'],
 ARRAY[]::text[],
 '{}'::jsonb, 30),

('Ar Condicionado','Cabine',
 ARRAY['ar condicionado','condicionador','compressor de ar','condensador de ar','evaporador','blower'],
 ARRAY['hvac','ac compressor','condenser','evaporator'],
 ARRAY['aire acondicionado'],
 ARRAY[]::text[],
 '{}'::jsonb, 35),

('Lubrificantes e Fluidos','Consumíveis',
 ARRAY['lubrificante','graxa','fluido','liquido de arrefecimento','líquido de arrefecimento'],
 ARRAY['grease','fluid','coolant','lubricant'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{}'::jsonb, 40),

('Adesivos e Plaquetas','Consumíveis',
 ARRAY['adesivo','emblema','plaqueta','etiqueta'],
 ARRAY['decal','sticker','badge','plate'],
 ARRAY[]::text[],
 ARRAY[]::text[],
 '{}'::jsonb, 50),

('Fixadores','Consumíveis',
 ARRAY['parafuso','porca','arruela','prisioneiro','pino','bucha','niple','flange','acoplamento','terminal','alavanca','pedal','suporte','barra','bocal','tampa','reservatorio','reservatório','tanque'],
 ARRAY['bolt','nut','washer','screw','pin','flange','coupling'],
 ARRAY['tornillo','tuerca','arandela'],
 ARRAY[]::text[],
 '{}'::jsonb, 90),

('Kits de Reparo','Consumíveis',
 ARRAY['kit','reparo'],
 ARRAY['kit','repair kit'],
 ARRAY['kit'],
 ARRAY[]::text[],
 '{}'::jsonb, 80)
ON CONFLICT (subcategory) DO UPDATE SET
  category_group = EXCLUDED.category_group,
  synonyms_pt = EXCLUDED.synonyms_pt,
  synonyms_en = EXCLUDED.synonyms_en,
  synonyms_es = EXCLUDED.synonyms_es,
  negative_terms = EXCLUDED.negative_terms,
  attribute_extractors = EXCLUDED.attribute_extractors,
  priority = EXCLUDED.priority,
  updated_at = now();
