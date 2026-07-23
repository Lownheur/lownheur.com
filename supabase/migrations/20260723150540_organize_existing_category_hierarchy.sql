-- Organize the owner's existing sample categories according to the hierarchy
-- explicitly approved for the V1. Missing titles are ignored.
with hierarchy(parent_title, child_title) as (
  values
    ('Danse', 'Breakdance'),
    ('Trajet', 'Voiture'),
    ('Trajet', 'Avion'),
    ('Sport', 'Musculation'),
    ('Sport', 'Course à pied'),
    ('Musique', 'Rap'),
    ('alimentation', 'Courses alimentaires'),
    ('alimentation', 'Petit-déjeuner'),
    ('alimentation', 'Déjeuner'),
    ('alimentation', 'Goûter'),
    ('alimentation', 'Dîner'),
    ('Déjeuner', 'Apéro'),
    ('Déjeuner', 'Entrée'),
    ('Déjeuner', 'Plat'),
    ('Déjeuner', 'Dessert')
)
update public.categories as child
set parent_id = parent.id
from public.categories as parent, hierarchy
where child.user_id = parent.user_id
  and lower(child.title) = lower(hierarchy.child_title)
  and lower(parent.title) = lower(hierarchy.parent_title)
  and child.id <> parent.id;
