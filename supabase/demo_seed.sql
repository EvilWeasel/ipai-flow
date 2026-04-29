-- IPAI Flow credible demo dataset
--
-- Safe for a disposable/demo Supabase database. This seed intentionally clears
-- all forum data so the pitch cannot surface stale ad hoc posts, then loads a
-- controlled IPAI Flow dataset.
--
-- Demo login password for every seeded user: ipai-demo-2026
-- Password hash was generated with bcrypt cost 10.

begin;

truncate table
  public.votes,
  public.comments,
  public.posts,
  public.sessions,
  public.users
restart identity cascade;

insert into public.users
  (id, username, password_hash, created_at, karma)
overriding system value
values
  (9201, 'anna_research', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 864000), 42),
  (9202, 'max_startups', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 777600), 35),
  (9203, 'leonie_policy', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 691200), 31),
  (9204, 'samir_infra', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 604800), 29),
  (9205, 'nora_events', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 518400), 23),
  (9206, 'tobias_funding', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 432000), 18),
  (9207, 'mira_ops', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 345600), 16),
  (9208, 'jan_member', '$2b$10$deOjsljjZNZoBUWJMOrRheu3g9tO.rNU33IDhOH8s5sGSG5Uy6hQ2', (extract(epoch from now())::integer - 259200), 12);

insert into public.posts
  (id, user_id, title, url, body, tags, created_at, score, comment_count, ai_summary, flagged)
overriding system value
values
  (
    9301,
    9201,
    'Discussion: evaluating retrieval quality for domain-specific research assistants',
    'https://ip.ai/research/retrieval-quality-notes',
    'We are comparing hybrid search, reranking, and citation-grounded evaluation for assistants that answer questions over IPAI member publications. The open question is how much expert review we need before results are good enough for a shared internal benchmark.',
    'AI,Research,Infrastructure',
    (extract(epoch from now())::integer - 5400),
    8,
    4,
    'Research discussion on measuring retrieval quality for IPAI domain assistants, with emphasis on hybrid search, reranking, citation grounding, and practical expert review effort.',
    0
  ),
  (
    9302,
    9202,
    'Member project update: lightweight agent workflow for manufacturing SMEs',
    'https://ip.ai/projects/sme-agent-workflow',
    'Our prototype connects supplier emails, machine availability, and quote templates so a small manufacturer can prepare a draft offer in minutes. We are looking for two IPAI member companies to sanity-check the workflow and edge cases.',
    'AI,Startups,Infrastructure',
    (extract(epoch from now())::integer - 12600),
    5,
    3,
    'Startup project update seeking IPAI member feedback on an agent workflow that helps manufacturing SMEs prepare quote drafts from operational context.',
    0
  ),
  (
    9303,
    9206,
    'Collaboration ask: Horizon Europe consortium on trustworthy AI testbeds',
    null,
    'We are assembling a consortium around trustworthy AI testbeds for applied industrial settings. Missing pieces: evaluation partners, legal/policy expertise, and one startup with a deployable monitoring component. Deadline for expressions of interest is next Friday.',
    'Research,Policy,Startups',
    (extract(epoch from now())::integer - 25200),
    4,
    3,
    'Funding and collaboration ask for a Horizon Europe consortium focused on trustworthy AI testbeds, especially evaluation, policy, and deployable monitoring partners.',
    0
  ),
  (
    9304,
    9203,
    'Policy note: what the EU AI Act means for IPAI member demos',
    'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
    'For upcoming public demos, teams should be explicit about intended use, human oversight, data sources, and whether outputs are advisory. This is not legal advice, but it is a useful checklist before presenting prototypes to partners.',
    'Policy,AI',
    (extract(epoch from now())::integer - 39600),
    4,
    2,
    'Policy note translating EU AI Act expectations into a practical checklist for IPAI prototype demos: intended use, oversight, data sources, and advisory output framing.',
    0
  ),
  (
    9305,
    9205,
    'Event recap: applied AI founders roundtable at the Innovation Park',
    null,
    'Strong signal from the founders roundtable: teams want fewer generic AI talks and more working sessions on procurement, compliance, and customer discovery. The most useful format was a 20-minute case clinic followed by targeted introductions.',
    'Events,Startups',
    (extract(epoch from now())::integer - 61200),
    3,
    2,
    'Event recap from the applied AI founders roundtable, highlighting demand for practical sessions on procurement, compliance, customer discovery, and targeted introductions.',
    0
  ),
  (
    9306,
    9204,
    'Infrastructure recommendation: self-hosted eval runs with LiteLLM and Postgres',
    'https://docs.litellm.ai/',
    'For teams that need reproducible evals without sending prompts through multiple dashboards, LiteLLM plus Postgres logging has worked well. The main lesson: version prompts, model settings, and test sets together or comparisons become noisy fast.',
    'Infrastructure,AI,Research',
    (extract(epoch from now())::integer - 82800),
    3,
    3,
    'Tool recommendation for reproducible self-hosted AI evaluations using LiteLLM and Postgres logging, with prompt and test-set versioning as the key practice.',
    0
  ),
  (
    9307,
    9207,
    'Ops note: proposed tags for the IPAI Flow pilot',
    null,
    'For the pilot week I suggest keeping tags intentionally small: AI, Startups, Research, Policy, Infrastructure, Events. This should make the digest easier to scan while still covering the main community workflows.',
    'Infrastructure,Events',
    (extract(epoch from now())::integer - 97200),
    2,
    1,
    'Operations note proposing a compact initial tag set for the IPAI Flow pilot so the feed and digest stay easy to scan.',
    0
  );

insert into public.comments
  (id, post_id, user_id, parent_id, body, created_at, score)
overriding system value
values
  (9401, 9301, 9204, null, 'The benchmark should include at least one negative-control set where the answer is not present. Otherwise the systems look better than they are because every query appears answerable.', (extract(epoch from now())::integer - 4800), 3),
  (9402, 9301, 9203, null, 'For policy-facing use cases, I would also track whether the answer clearly distinguishes source text from model interpretation. That is often where trust breaks down in demos.', (extract(epoch from now())::integer - 4200), 3),
  (9403, 9301, 9208, 9401, 'Agree. We can contribute a small set of failed search queries from the member onboarding desk if useful.', (extract(epoch from now())::integer - 3600), 1),
  (9404, 9301, 9206, null, 'Could this become a shared IPAI eval suite? It would strengthen several funding proposals if partners can point to common test infrastructure.', (extract(epoch from now())::integer - 3000), 1),
  (9405, 9302, 9207, null, 'Happy to test this with the operations team. Quote preparation is a good demo because the value is concrete and the human review step is obvious.', (extract(epoch from now())::integer - 10800), 1),
  (9406, 9302, 9204, null, 'Please include a failure mode where supplier data is incomplete. SMEs will trust the workflow more if it asks for missing inputs instead of inventing them.', (extract(epoch from now())::integer - 9000), 1),
  (9407, 9302, 9202, 9406, 'Good point. We already show uncertainty flags, but I will add an explicit missing-input checklist before the next walkthrough.', (extract(epoch from now())::integer - 7200), 1),
  (9408, 9303, 9201, null, 'Our group can likely cover evaluation design. We have active work on citation checks and human-in-the-loop review protocols.', (extract(epoch from now())::integer - 21600), 1),
  (9409, 9303, 9203, null, 'I can help shape the governance work package. The strongest angle may be practical compliance evidence rather than another abstract framework.', (extract(epoch from now())::integer - 19800), 1),
  (9410, 9303, 9202, null, 'We have a monitoring component that could fit if the consortium needs startup participation. I will send a short capability note.', (extract(epoch from now())::integer - 18000), 1),
  (9411, 9304, 9205, null, 'This checklist would be useful as a one-page speaker prep sheet before public IPAI demo days.', (extract(epoch from now())::integer - 34200), 1),
  (9412, 9304, 9208, null, 'Please add a line about logging demo data sources. Even when the dataset is synthetic, people ask where examples came from.', (extract(epoch from now())::integer - 32400), 1),
  (9413, 9305, 9206, null, 'The case clinic format also helps funders see where collaboration is real. We should repeat it with research teams and startups in the same room.', (extract(epoch from now())::integer - 55800), 1),
  (9414, 9305, 9202, null, 'Customer discovery was the strongest thread. Several founders asked for warm intros to Mittelstand buyers instead of more pitch practice.', (extract(epoch from now())::integer - 54000), 1),
  (9415, 9306, 9201, null, 'Versioning the test set is the part teams skip. Once examples change, a better score can just mean an easier benchmark.', (extract(epoch from now())::integer - 77400), 1),
  (9416, 9306, 9207, null, 'Could we publish a minimal template for eval run metadata? That would make internal comparisons much easier.', (extract(epoch from now())::integer - 75600), 1),
  (9417, 9306, 9204, 9416, 'Yes. I can share a Postgres schema with run id, prompt version, model config, dataset version, score, and reviewer notes.', (extract(epoch from now())::integer - 73800), 1),
  (9418, 9307, 9205, null, 'This tag set maps well to event programming too. It should keep weekly digests from turning into a long unstructured list.', (extract(epoch from now())::integer - 90000), 1);

insert into public.votes
  (user_id, target_kind, target_id, value, created_at)
values
  (9201, 'post', 9301, 1, (extract(epoch from now())::integer - 5400)),
  (9202, 'post', 9301, 1, (extract(epoch from now())::integer - 5100)),
  (9203, 'post', 9301, 1, (extract(epoch from now())::integer - 5000)),
  (9204, 'post', 9301, 1, (extract(epoch from now())::integer - 4900)),
  (9205, 'post', 9301, 1, (extract(epoch from now())::integer - 4800)),
  (9206, 'post', 9301, 1, (extract(epoch from now())::integer - 4700)),
  (9207, 'post', 9301, 1, (extract(epoch from now())::integer - 4600)),
  (9208, 'post', 9301, 1, (extract(epoch from now())::integer - 4500)),
  (9201, 'post', 9302, 1, (extract(epoch from now())::integer - 12600)),
  (9202, 'post', 9302, 1, (extract(epoch from now())::integer - 12500)),
  (9204, 'post', 9302, 1, (extract(epoch from now())::integer - 12400)),
  (9207, 'post', 9302, 1, (extract(epoch from now())::integer - 12300)),
  (9208, 'post', 9302, 1, (extract(epoch from now())::integer - 12200)),
  (9201, 'post', 9303, 1, (extract(epoch from now())::integer - 25200)),
  (9202, 'post', 9303, 1, (extract(epoch from now())::integer - 25100)),
  (9203, 'post', 9303, 1, (extract(epoch from now())::integer - 25000)),
  (9206, 'post', 9303, 1, (extract(epoch from now())::integer - 24900)),
  (9201, 'post', 9304, 1, (extract(epoch from now())::integer - 39600)),
  (9203, 'post', 9304, 1, (extract(epoch from now())::integer - 39500)),
  (9205, 'post', 9304, 1, (extract(epoch from now())::integer - 39400)),
  (9208, 'post', 9304, 1, (extract(epoch from now())::integer - 39300)),
  (9202, 'post', 9305, 1, (extract(epoch from now())::integer - 61200)),
  (9205, 'post', 9305, 1, (extract(epoch from now())::integer - 61100)),
  (9206, 'post', 9305, 1, (extract(epoch from now())::integer - 61000)),
  (9201, 'post', 9306, 1, (extract(epoch from now())::integer - 82800)),
  (9204, 'post', 9306, 1, (extract(epoch from now())::integer - 82700)),
  (9207, 'post', 9306, 1, (extract(epoch from now())::integer - 82600)),
  (9205, 'post', 9307, 1, (extract(epoch from now())::integer - 97200)),
  (9207, 'post', 9307, 1, (extract(epoch from now())::integer - 97100)),
  (9201, 'comment', 9401, 1, (extract(epoch from now())::integer - 4800)),
  (9203, 'comment', 9401, 1, (extract(epoch from now())::integer - 4700)),
  (9204, 'comment', 9401, 1, (extract(epoch from now())::integer - 4600)),
  (9201, 'comment', 9402, 1, (extract(epoch from now())::integer - 4200)),
  (9203, 'comment', 9402, 1, (extract(epoch from now())::integer - 4100)),
  (9206, 'comment', 9402, 1, (extract(epoch from now())::integer - 4000)),
  (9208, 'comment', 9403, 1, (extract(epoch from now())::integer - 3600)),
  (9206, 'comment', 9404, 1, (extract(epoch from now())::integer - 3000)),
  (9207, 'comment', 9405, 1, (extract(epoch from now())::integer - 10800)),
  (9204, 'comment', 9406, 1, (extract(epoch from now())::integer - 9000)),
  (9202, 'comment', 9407, 1, (extract(epoch from now())::integer - 7200)),
  (9201, 'comment', 9408, 1, (extract(epoch from now())::integer - 21600)),
  (9203, 'comment', 9409, 1, (extract(epoch from now())::integer - 19800)),
  (9202, 'comment', 9410, 1, (extract(epoch from now())::integer - 18000)),
  (9205, 'comment', 9411, 1, (extract(epoch from now())::integer - 34200)),
  (9208, 'comment', 9412, 1, (extract(epoch from now())::integer - 32400)),
  (9206, 'comment', 9413, 1, (extract(epoch from now())::integer - 55800)),
  (9202, 'comment', 9414, 1, (extract(epoch from now())::integer - 54000)),
  (9201, 'comment', 9415, 1, (extract(epoch from now())::integer - 77400)),
  (9207, 'comment', 9416, 1, (extract(epoch from now())::integer - 75600)),
  (9204, 'comment', 9417, 1, (extract(epoch from now())::integer - 73800)),
  (9205, 'comment', 9418, 1, (extract(epoch from now())::integer - 90000));

select setval(pg_get_serial_sequence('public.users', 'id'), greatest((select coalesce(max(id), 1) from public.users), 1), true);
select setval(pg_get_serial_sequence('public.posts', 'id'), greatest((select coalesce(max(id), 1) from public.posts), 1), true);
select setval(pg_get_serial_sequence('public.comments', 'id'), greatest((select coalesce(max(id), 1) from public.comments), 1), true);

commit;
