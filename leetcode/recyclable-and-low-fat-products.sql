-- Problem : recyclable-and-low-fat-products
-- Platform: leetcode
-- URL     : https://leetcode.com/problems/recyclable-and-low-fat-products/submissions/1972328207/?envType=study-plan-v2&envId=top-sql-50
-- Solved  : 2026-04-08T07:04:22.907Z
-- 
select product_id from products where low_fats='Y' and recyclable='Y';