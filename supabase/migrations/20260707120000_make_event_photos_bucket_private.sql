-- Le bucket event-photos passe en privé : les photos ne sont plus
-- accessibles via une URL publique permanente. L'application les affiche
-- via des URLs signées (createSignedUrl, validité 1h) générées côté client
-- avec la clé anon, autorisée par la policy SELECT « Public read » sur
-- storage.objects. Les URLs partagées/mises en cache expirent au lieu de
-- donner un accès public indéfini.

update storage.buckets set public = false where id = 'event-photos';
