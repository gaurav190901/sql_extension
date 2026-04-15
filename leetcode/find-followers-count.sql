-- Problem : find-followers-count
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-15T08:47:59.275Z
--

select user_id,count(user_id)as followers_count from followers group by user_id order by user_id;