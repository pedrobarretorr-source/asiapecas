
-- Drop existing public policies and replace with authenticated-only for sensitive tables

-- CUSTOMERS
DROP POLICY IF EXISTS "Anyone can read customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;
CREATE POLICY "Authenticated can read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

-- SALES
DROP POLICY IF EXISTS "Anyone can read sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can update sales" ON public.sales;
DROP POLICY IF EXISTS "Anyone can delete sales" ON public.sales;
CREATE POLICY "Authenticated can read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sales" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

-- SALE_ITEMS
DROP POLICY IF EXISTS "Anyone can read sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Anyone can delete sale_items" ON public.sale_items;
CREATE POLICY "Authenticated can read sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sale_items" ON public.sale_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sale_items" ON public.sale_items FOR DELETE TO authenticated USING (true);

-- PROSPECTS
DROP POLICY IF EXISTS "Anyone can read prospects" ON public.prospects;
DROP POLICY IF EXISTS "Anyone can insert prospects" ON public.prospects;
DROP POLICY IF EXISTS "Anyone can update prospects" ON public.prospects;
DROP POLICY IF EXISTS "Anyone can delete prospects" ON public.prospects;
CREATE POLICY "Authenticated can read prospects" ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert prospects" ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update prospects" ON public.prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete prospects" ON public.prospects FOR DELETE TO authenticated USING (true);

-- AFTER_SALES
DROP POLICY IF EXISTS "Anyone can read after_sales" ON public.after_sales;
DROP POLICY IF EXISTS "Anyone can insert after_sales" ON public.after_sales;
DROP POLICY IF EXISTS "Anyone can update after_sales" ON public.after_sales;
DROP POLICY IF EXISTS "Anyone can delete after_sales" ON public.after_sales;
CREATE POLICY "Authenticated can read after_sales" ON public.after_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert after_sales" ON public.after_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update after_sales" ON public.after_sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete after_sales" ON public.after_sales FOR DELETE TO authenticated USING (true);

-- PROSPECTION_CAMPAIGNS
DROP POLICY IF EXISTS "Anyone can read campaigns" ON public.prospection_campaigns;
DROP POLICY IF EXISTS "Anyone can insert campaigns" ON public.prospection_campaigns;
DROP POLICY IF EXISTS "Anyone can update campaigns" ON public.prospection_campaigns;
DROP POLICY IF EXISTS "Anyone can delete campaigns" ON public.prospection_campaigns;
CREATE POLICY "Authenticated can read campaigns" ON public.prospection_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert campaigns" ON public.prospection_campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update campaigns" ON public.prospection_campaigns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete campaigns" ON public.prospection_campaigns FOR DELETE TO authenticated USING (true);

-- MARKET_RESEARCH
DROP POLICY IF EXISTS "Anyone can read market_research" ON public.market_research;
DROP POLICY IF EXISTS "Anyone can insert market_research" ON public.market_research;
DROP POLICY IF EXISTS "Anyone can update market_research" ON public.market_research;
DROP POLICY IF EXISTS "Anyone can delete market_research" ON public.market_research;
CREATE POLICY "Authenticated can read market_research" ON public.market_research FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert market_research" ON public.market_research FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update market_research" ON public.market_research FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete market_research" ON public.market_research FOR DELETE TO authenticated USING (true);

-- STOCK_IMPORTS
DROP POLICY IF EXISTS "Anyone can read stock_imports" ON public.stock_imports;
DROP POLICY IF EXISTS "Anyone can insert stock_imports" ON public.stock_imports;
DROP POLICY IF EXISTS "Anyone can update stock_imports" ON public.stock_imports;
DROP POLICY IF EXISTS "Anyone can delete stock_imports" ON public.stock_imports;
CREATE POLICY "Authenticated can read stock_imports" ON public.stock_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock_imports" ON public.stock_imports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update stock_imports" ON public.stock_imports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete stock_imports" ON public.stock_imports FOR DELETE TO authenticated USING (true);

-- STOCK_IMPORT_ITEMS
DROP POLICY IF EXISTS "Anyone can read stock_import_items" ON public.stock_import_items;
DROP POLICY IF EXISTS "Anyone can insert stock_import_items" ON public.stock_import_items;
DROP POLICY IF EXISTS "Anyone can update stock_import_items" ON public.stock_import_items;
DROP POLICY IF EXISTS "Anyone can delete stock_import_items" ON public.stock_import_items;
CREATE POLICY "Authenticated can read stock_import_items" ON public.stock_import_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock_import_items" ON public.stock_import_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update stock_import_items" ON public.stock_import_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete stock_import_items" ON public.stock_import_items FOR DELETE TO authenticated USING (true);

-- PARTS: keep public SELECT, restrict write to authenticated
DROP POLICY IF EXISTS "Authenticated users can delete parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can update parts" ON public.parts;
CREATE POLICY "Authenticated can insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update parts" ON public.parts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete parts" ON public.parts FOR DELETE TO authenticated USING (true);

-- QUOTE_REQUESTS: keep public INSERT + SELECT, restrict UPDATE/DELETE to authenticated
DROP POLICY IF EXISTS "Anyone can update quote_requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Anyone can delete quote_requests" ON public.quote_requests;
CREATE POLICY "Authenticated can update quote_requests" ON public.quote_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete quote_requests" ON public.quote_requests FOR DELETE TO authenticated USING (true);
