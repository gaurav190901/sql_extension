-- Problem : average-selling-price
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-07-09T15:22:16.259Z
--

select p.product_id, IFNULL(round(sum(u.units*p.price)/sum(u.units),2),0)as average_price
from prices p 
left join unitssold u 
on p.product_id=u.product_id 
and u.purchase_date
between p.start_date and p.end_date 
group by p.product_id;