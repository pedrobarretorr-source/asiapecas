
CREATE TABLE public.proposal_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'Ásia Peças & Máquinas',
  cnpj text NOT NULL DEFAULT 'XX.XXX.XXX/XXXX-XX',
  address text NOT NULL DEFAULT 'Macapá - AP',
  phone text NOT NULL DEFAULT '+55 95 97400-9289',
  email text NOT NULL DEFAULT 'contato@asiapecas.com.br',
  default_validity_days integer NOT NULL DEFAULT 15,
  default_delivery_terms text NOT NULL DEFAULT '7 a 15 dias úteis após confirmação do pedido',
  default_warranty_text text NOT NULL DEFAULT 'Garantia de 3 meses contra defeitos de fabricação. Não cobre mau uso ou instalação inadequada.',
  default_observations text NOT NULL DEFAULT 'Frete: a combinar. Instalação: não inclusa. Produtos sujeitos à disponibilidade em estoque. Valores podem sofrer alteração após vencimento da proposta.',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.proposal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read proposal_settings" ON public.proposal_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert proposal_settings" ON public.proposal_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update proposal_settings" ON public.proposal_settings FOR UPDATE TO authenticated USING (true);

INSERT INTO public.proposal_settings (id) VALUES (gen_random_uuid());
