-- Problem : invalid-tweets
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:15:09.915Z
--

select tweet_id from tweets where length(content)>15;