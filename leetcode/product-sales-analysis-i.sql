-- Problem : product-sales-analysis-i
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:16:22.350Z
--

select p.product_name, s.year, s.price from sales s left join product p on p.product_id=s.product_id;
