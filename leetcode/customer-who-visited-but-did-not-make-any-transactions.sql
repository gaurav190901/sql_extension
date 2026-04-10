-- Problem : customer-who-visited-but-did-not-make-any-transactions
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:17:15.126Z
--

select v.customer_id, count(*)as count_no_trans from visits v left join transactions t on v.visit_id=t.visit_id where t.visit_id is null group by v.customer_id;