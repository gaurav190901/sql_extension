-- Problem : article-views-i
-- Platform: leetcode
-- URL     : 
-- Solved  : 2026-04-10T10:14:47.989Z
--

select author_id as id from views where author_id=viewer_id group by author_id order by author_id;