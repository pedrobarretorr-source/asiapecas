-- Improved classifier: broader dictionary + stricter regex + confidence scoring
CREATE OR REPLACE FUNCTION public.apply_subcategory_rules(_only_missing boolean DEFAULT true)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  r RECORD;
  v_text text;
  v_sub text;
  v_attrs jsonb;
  v_match text;
  v_conf numeric;
BEGIN
  FOR r IN
    SELECT id, description, material
    FROM public.parts p
    WHERE (NOT _only_missing) OR p.subcategory IS NULL OR p.subcategory = ''
  LOOP
    v_text := lower(coalesce(r.description,'') || ' ' || coalesce(r.material,''));
    v_sub := NULL;
    v_attrs := '{}'::jsonb;
    v_conf := 0.85;

    -- Order matters: most specific first

    -- TIRES — strict patterns only
    IF v_text ~ '(\mpneu\M|\mtire\M|\mtyre\M|\mllanta\M|neumatico)' THEN
      v_sub := 'Pneus'; v_conf := 1.0;
      v_match := (regexp_match(v_text, '(\d{2,3}\.?\d?\s?r\s?\d{2})'))[1];
      IF v_match IS NULL THEN v_match := (regexp_match(v_text, '(\d{2,3}\.?\d?\s?-\s?\d{2})'))[1]; END IF;
      IF v_match IS NULL THEN v_match := (regexp_match(v_text, '(\d{2,3}/\d{2,3}\s?r\s?\d{2})'))[1]; END IF;
      IF v_match IS NOT NULL THEN
        v_attrs := v_attrs || jsonb_build_object('medida', upper(regexp_replace(v_match, '\s+', '', 'g')));
      END IF;

    -- HEADLIGHTS / WORK LIGHTS
    ELSIF v_text ~ '(farol|farois|head ?light|head ?lamp|luz de trabalho|work ?light|luminaria|lanterna)' THEN
      v_sub := 'Faróis e Iluminação'; v_conf := 1.0;
      IF v_text ~ '\mled\M' THEN v_attrs := v_attrs || jsonb_build_object('tipo','LED');
      ELSIF v_text ~ '(halog|xenon)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Halógeno'); END IF;
      IF v_text ~ '(diant|front|delant)' THEN v_attrs := v_attrs || jsonb_build_object('posicao','Dianteiro');
      ELSIF v_text ~ '(tras|rear)' THEN v_attrs := v_attrs || jsonb_build_object('posicao','Traseiro');
      ELSIF v_text ~ '(trabalho|work)' THEN v_attrs := v_attrs || jsonb_build_object('posicao','Trabalho'); END IF;

    -- LAMPS / BULBS / FUSES (electrical small)
    ELSIF v_text ~ '(\mlampada\M|\mlâmpada\M|\mbulb\m|\mfusivel\M|\mfusível\M|\mfuse\M|\mrele\M|\mrelé\M|\mrelay\M)' THEN
      v_sub := 'Faróis e Iluminação'; v_conf := 0.7;

    -- FILTERS
    ELSIF v_text ~ '(\mfiltro\M|\mfilter\M|\mfiltre\M)' THEN
      v_sub := 'Filtros'; v_conf := 1.0;
      IF v_text ~ '(óleo|oleo|\moil\M|aceite)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Óleo');
      ELSIF v_text ~ '(combust|\mfuel\M|diesel|gasolina)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Combustível');
      ELSIF v_text ~ '(hidr|hydraulic)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Hidráulico');
      ELSIF v_text ~ '(cabine|cabin)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Cabine');
      ELSIF v_text ~ '(separador|water|\magua\M|água)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Separador de água');
      ELSIF v_text ~ '(\mar\M|\mair\M|\maire\M)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Ar'); END IF;

    -- HOSES / TUBES
    ELSIF v_text ~ '(mangueira|\mhose\M|manguera|tubo flex|conexao hidr|conexão hidr)' THEN
      v_sub := 'Mangueiras e Tubos'; v_conf := 0.9;

    -- BEARINGS — strict pattern
    ELSIF v_text ~ '(rolamento|\mbearing\M|cojinete|rodamiento|mancal)' THEN
      v_sub := 'Rolamentos'; v_conf := 1.0;
      v_match := (regexp_match(v_text, '\m(6\d{3,4}|3\d{4}|2\d{4}|\d{5})\M'))[1];
      IF v_match IS NOT NULL THEN v_attrs := v_attrs || jsonb_build_object('codigo', v_match); END IF;

    -- HYDRAULIC CYLINDERS
    ELSIF v_text ~ '(cilindro hidr|cilindro hydra|hydraulic cyl|cilindro de levant|cilindro da lanca|cilindro da lança|cilindro do braço|cilindro caçamba)' THEN
      v_sub := 'Cilindros Hidráulicos'; v_conf := 1.0;

    -- PUMPS
    ELSIF v_text ~ '(\mbomba\M|\mpump\M)' THEN
      v_sub := 'Bombas'; v_conf := 0.95;
      IF v_text ~ '(hidr|hydra)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Hidráulica');
      ELSIF v_text ~ '(óleo|oleo|oil)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Óleo');
      ELSIF v_text ~ '(combust|fuel)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Combustível');
      ELSIF v_text ~ '(\magua\M|water|água)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Água'); END IF;

    -- BELTS / PULLEYS
    ELSIF v_text ~ '(\mcorreia\M|\mbelt\M|\mcorrea\M|\mpolia\M|\mpulley\M)' THEN
      v_sub := 'Correias'; v_conf := 0.95;

    -- SEALS / GASKETS / O-RINGS
    ELSIF v_text ~ '(vedação|vedacao|\mseal\M|reten|o[- ]?ring|junta|gasket|empaque|anel de borracha)' THEN
      v_sub := 'Vedações e Retentores'; v_conf := 1.0;

    -- FASTENERS
    ELSIF v_text ~ '(parafuso|\mbolt\M|tornillo|\mporca\M|\mnut\M|arruela|washer|prisioneiro|screw|\mpino\M|\mbucha\M|niple|flange|acoplament|terminal)' THEN
      v_sub := 'Fixadores'; v_conf := 0.85;

    -- GROUND ENGAGING TOOLS
    ELSIF v_text ~ '(lamina|lâmina|\mblade\M|cuchilla|dente.*caçamba|dente.*cacamba|\mtooth\M|caçamba|cacamba|\mbucket\M|cantoneira|adaptador.*dente)' THEN
      v_sub := 'Implementos de Solo'; v_conf := 1.0;

    -- BATTERIES
    ELSIF v_text ~ '(\mbateria\M|\mbattery\M|\mbatteria\M)' THEN
      v_sub := 'Baterias'; v_conf := 1.0;
      IF v_text ~ '24\s?v' THEN v_attrs := v_attrs || jsonb_build_object('tensao','24V');
      ELSIF v_text ~ '12\s?v' THEN v_attrs := v_attrs || jsonb_build_object('tensao','12V'); END IF;

    -- COOLING
    ELSIF v_text ~ '(radiador|radiator|intercooler|trocador.*calor|reservatori|expansao|expansão|tanque.*agua|tanque.*água|ventoinha|ventilador|\mfan\M|coletor.*escape|silencioso|escapamento)' THEN
      v_sub := 'Radiadores e Arrefecimento'; v_conf := 0.9;

    -- ALTERNATORS
    ELSIF v_text ~ '(alternador|alternator)' THEN
      v_sub := 'Alternadores'; v_conf := 1.0;

    -- STARTERS
    ELSIF v_text ~ '(motor.*partida|\mstarter\M|\marranque\M)' THEN
      v_sub := 'Motor de Partida'; v_conf := 1.0;

    -- INJECTORS
    ELSIF v_text ~ '(injetor|injector|bico.*inj|solenoide|solenoid)' THEN
      v_sub := 'Injetores e Bicos'; v_conf := 1.0;

    -- TURBOS
    ELSIF v_text ~ '(\mturbo\M|turbina|turbocharger|turbocompressor)' THEN
      v_sub := 'Turbinas'; v_conf := 1.0;

    -- VALVES
    ELSIF v_text ~ '(valvula|válvula|\mvalve\M)' THEN
      v_sub := 'Válvulas'; v_conf := 0.95;

    -- SENSORS
    ELSIF v_text ~ '(\msensor\M|sender|\msonda\M|chave.*pressao|chave.*pressão|interruptor.*pressao|interruptor.*pressão)' THEN
      v_sub := 'Sensores'; v_conf := 0.95;

    -- WIRING
    ELSIF v_text ~ '(chicote|harness|cable.*asse|cabo.*eletric|cabo.*elétric|\mfio\M.*eletric)' THEN
      v_sub := 'Chicotes Elétricos'; v_conf := 0.9;

    -- BRAKES / CLUTCH
    ELSIF v_text ~ '(\mdisco\M|pastilha|\mlona\M|\mpad\M|\mbrake\M|\mfreio\M|\mclutch\M|embreagem|disco.*freio)' THEN
      v_sub := 'Freios e Embreagem'; v_conf := 0.95;

    -- SHOCKS
    ELSIF v_text ~ '(amortecedor|shock.*abs|absorber)' THEN
      v_sub := 'Amortecedores'; v_conf := 1.0;

    -- UNDERCARRIAGE
    ELSIF v_text ~ '(rolete|\mroller\M|esteira|\mtrack\M|sprocket|coroa.*esteira|\msapata\M|elo.*esteira|\mguia\M.*esteira)' THEN
      v_sub := 'Material Rodante'; v_conf := 1.0;

    -- GEARS
    ELSIF v_text ~ '(engrenagem|\mgear\M|planet|engranaje|coroa(\s|$)|\mpinhao\M|\mpinhão\M|cremalheira)' THEN
      v_sub := 'Engrenagens'; v_conf := 0.95;

    -- AXLES / SHAFTS
    ELSIF v_text ~ '(\meixo\M|\mshaft\M|cardan|semi.?eixo|\maxle\M|volante|flywheel)' THEN
      v_sub := 'Eixos e Cardans'; v_conf := 0.9;

    -- CABIN / GLASS
    ELSIF v_text ~ '(cabine|cabin|\mvidro\M|\mglass\M|para.?brisa|porta.*cabine|tampa|\mplaca\M.*cabine)' THEN
      v_sub := 'Cabine e Vidros'; v_conf := 0.9;

    -- SEATS
    ELSIF v_text ~ '(\mbanco\M|\mseat\M|assento)' THEN
      v_sub := 'Bancos'; v_conf := 1.0;

    -- MIRRORS
    ELSIF v_text ~ '(retrovisor|\mmirror\M|\mespelho\M)' THEN
      v_sub := 'Retrovisores'; v_conf := 1.0;

    -- HVAC
    ELSIF v_text ~ '(ar.*condic|\mhvac\M|compressor.*ar|condensador.*ar|evaporador|blower)' THEN
      v_sub := 'Ar Condicionado'; v_conf := 1.0;

    -- LUBRICANTS / FLUIDS
    ELSIF v_text ~ '(lubrif|\mgrease\M|\mgraxa\M|fluido|\moleo\M\s|\móleo\M\s|líquido.*arref)' THEN
      v_sub := 'Lubrificantes e Fluidos'; v_conf := 0.85;

    -- DECALS
    ELSIF v_text ~ '(\mdecal\M|adesivo|sticker|emblema|plaqueta|etiqueta)' THEN
      v_sub := 'Adesivos e Plaquetas'; v_conf := 1.0;

    -- REPAIR KITS
    ELSIF v_text ~ '(\mkit\M|\mreparo\M|\mrepair\M)' THEN
      v_sub := 'Kits de Reparo'; v_conf := 0.7;

    -- LEVERS / PEDALS / SUPPORTS (chassis hardware) — fallback to Fasteners-ish category
    ELSIF v_text ~ '(\malavanca\M|\mpedal\M|suporte|\mbraço\M|\mbraco\M|\mbarra\M|\mbocal\M|\mtampa\M|\mreservatorio\M|\mreservatório\M|\mtanque\M)' THEN
      v_sub := 'Fixadores'; v_conf := 0.6;

    END IF;

    IF v_sub IS NOT NULL THEN
      UPDATE public.parts
        SET subcategory = v_sub,
            attributes = COALESCE(attributes,'{}'::jsonb) || v_attrs,
            subcategory_source = 'rule',
            subcategory_confidence = v_conf
      WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- Re-run on entire catalog (idempotent — overwrites with new richer attributes)
SELECT public.apply_subcategory_rules(false);
