# Initial GDPR and CCPA/CPRA matrix

This matrix defines product requirements and review prompts. It is not legal advice, a complete legal register, or proof that a law applies. ePrivacy and other sector/state rules may add requirements even when the GDPR or CCPA pack is selected.

## Applicability is an explicit decision

The tool asks the project to select rule packs; it does not infer legal applicability from an IP address or a company address. Before relying on results, an accountable reviewer must document role, establishment, target users, thresholds/exemptions, data categories, activity, and relevant dates.

- GDPR has no general revenue or user-count threshold. Its territorial test includes processing in the context of an EEA establishment and, for some non-EEA organisations, intentional offering of goods/services to people in the EEA or monitoring their behaviour there.
- CCPA/CPRA generally uses a for-profit business test plus statutory threshold(s), defined roles and exceptions. Thresholds are adjusted, so a scope decision should cite [current CPPA material](https://cppa.ca.gov/faq/) rather than copy a permanent number into the engine.
- `jurisdictions` selects executable packs. `applicability.<pack>` records `in-scope`, `out-of-scope`, or `needs-review`, a jurisdiction-specific role, reviewer, rationale, and decision date. A selected unresolved or unsupported v0.1 role stays visible as `needs_review`.
- `personalData.processed: false` supports projects with no personal-data processing and no invented activities, but `CORE-00A` keeps the claim under review. Hosting, CDN, updates, analytics and support must be included in that review.

## Control matrix

| Area | GDPR readiness | CCPA/CPRA readiness | MVP check/evidence |
|---|---|---|---|
| Inventory | Record purposes, data categories, recipients/processors, retention, transfers, and legal basis per activity | Record categories collected, sources, purposes, third parties, retention, and separate sale/sharing status | Each activity declares common facts plus GDPR basis and/or CCPA sale and sharing facts for selected profiles |
| Notice | Transparent, intelligible information under Arts. 12–14 | Privacy policy and notice at collection; include required categories and rights | Require public notice URLs and review dates; content review remains manual |
| Consent | Only where chosen as basis: freely given, specific, informed, unambiguous; demonstrate and make withdrawal as easy as giving | Consent is not the default CCPA model; opt-in applies in specific cases such as minors' sale/share | Consent activities require a declared withdrawal mechanism; validity, equal ease and runtime stopping remain `needs_review` in v0.1 |
| Other lawful bases | Contract, legal obligation, vital interests, public task, legitimate interests remain distinct | CCPA uses business-purpose, sale/share, exceptions and consumer-rights concepts rather than GDPR lawful bases | Manifest preserves the distinction; a selected label is still subject to human review |
| Data minimisation / purpose limits | Arts. 5 and 25 | Collection, use, retention, and sharing must be reasonably necessary and proportionate under CPRA amendments | Retention is mandatory; necessity/proportionality remains manual |
| Processors / service providers | Art. 28 terms, instructions, subprocessors, assistance, deletion/return | Contractual restrictions for service providers/contractors and third parties | Record recipients and relationship; contract evidence is indexed in a later milestone |
| International transfers | Declare destination and mechanism; adequacy, safeguards and transfer assessment may be needed | Disclosures and contracts may apply; no GDPR-equivalent general transfer chapter | GDPR activity with non-EEA destination must declare a safeguard or manual review |
| Rights requests | Access, rectification, erasure, restriction, portability, objection, complaint; response is generally within one month, with a possible two-month extension and first-month notice in qualifying cases | Know/access, delete, correct, opt out of sale/share, limit sensitive use, non-discrimination; confirmation, response, opt-out/limit and record-retention deadlines differ | Require channels and declared process; current deadlines, identity verification, exceptions and operational SLA evidence remain manual until workflow support exists |
| Sale/share and GPC | GPC may interact with objection/consent depending on context; it is not a universal GDPR consent receipt | Honour user-enabled opt-out preference signals as a valid request for sale/share; link and qualifying frictionless-signal paths differ | Sale/sharing needs a declared link or reviewed frictionless-signal mechanism; `gpc.honored: true` remains a declaration pending enforcement evidence |
| Sensitive data | Art. 9/10 conditions in addition to an Art. 6 basis where applicable | Right to limit use/disclosure of sensitive personal information, with statutory purposes/exceptions | Sensitive categories trigger a manual review; outside permitted purposes requires a limit-use mechanism |
| Automated decisions / AI | GDPR Arts. 13–15 and 22 may require information and safeguards depending on solely automated significant decisions | Current adopted California ADMT rules have phased compliance dates, including 2027 requirements for covered significant decisions | v0.1 only flags manual review; a public URL or generic human-review boolean is not treated as a legal conclusion |
| Security and incidents | Appropriate measures, processor duties, breach assessment and notification | Reasonable security; private action for certain breaches; other California laws may apply | Security contact and policy expected; operating effectiveness is outside v0.1 |
| Accountability | Records, DPIA where likely high risk, DPO where conditions apply, demonstrability | Document requests, responses, contracts and required disclosures | `manualReviews` records owners and decisions in later schema versions |

## Initial control IDs

### Shared

- `CORE-000`: each selected rule pack has a reviewed applicability and role rationale.
- `CORE-00A`: no-personal-data and unresolved processing-scope claims remain under review.
- `CORE-001`: controller/business identity and privacy contact are declared.
- `CORE-002`: public privacy notice URL is declared.
- `CORE-003`: every activity declares common facts plus profile-specific GDPR basis and/or separate CCPA sale/sharing status.
- `CORE-004`: sensitive data or significant automated decisions receive a manual review rather than an automatic pass.

### GDPR pack

- `GDPR-001`: a GDPR rights channel exists.
- `GDPR-002`: consent-based activities declare a withdrawal mechanism; validity, equal ease and propagation remain a review item.
- `GDPR-003`: non-EEA transfers declare a mechanism or are flagged for review.
- `GDPR-004`: legitimate-interest activities require a documented balancing-test reference.
- `GDPR-005`: significant automated decisions require explanation and safeguard review.

### CCPA pack

- `CCPA-001`: notice-at-collection URL exists.
- `CCPA-002`: California rights request methods are declared; the correct number and type require applicability review.
- `CCPA-003`: sale and sharing are declared separately; activities have a link or reviewed frictionless-signal mechanism and honour GPC. A boolean declaration alone remains a review item.
- `CCPA-004`: sensitive personal information outside declared permitted purposes has a limit-use mechanism.
- `CCPA-005`: sale/sharing and known-minor facts require a strict external release gate and verified authorisation review; v0.1 does not prove authorisation.

## Sources and maintenance

Official primary sources are listed in [`REFERENCES.md`](REFERENCES.md). Each rule pack carries `sourceVerifiedAt`, `legalReviewStatus`, version, source links, and limitations. A rule change requires a changelog entry, tests, reviewer identity, and a statement of whether projects must reassess. Legal review must be refreshed when source law, regulations, enforcement guidance, or product scope changes.
