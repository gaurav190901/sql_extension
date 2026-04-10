-- Problem : big-countries
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:14:24.707Z
--

select name, population, area from world where area>=3000000 OR population>=25000000;