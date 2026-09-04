# Instrument Trust Gateway

Build e-Maap using the attached "DESIGN (4).md" as the primary source of truth for product design, UX, information architecture, visual system, terminology, accessibility, and trust principles.

Do not redesign the product independently. Follow the Markdown specification unless an implementation detail is genuinely missing.

Objective

Build a functional MVP of e-Maap — an online verification system for weighing and measuring instruments.

This must be a working application, not a collection of static mockup screens.

MVP roles

Implement these three experiences:

1. Public User

   

   - No login required.

   - Verify an instrument/certificate using QR/code.

   - Show a clear verification result.

   - Clearly distinguish:

     - Verified / Valid

     - Pending / Not yet verified

     - Expired

     - Suspended

     - Failed / Rejected

     - Not Found

     - Service / Network Error

   - A network or service failure must NEVER be presented as an invalid certificate.

2. Business / Instrument Owner

   

   - Authentication.

   - Dashboard.

   - Register and manage instruments.

   - View instrument details and status.

   - Submit verification requests.

   - Track verification progress/history.

   - View certificates.

   - Receive relevant notifications.

   - Maintain business/profile information.

3. Verification Authority / Inspector

   

   - Authentication.

   - Authority dashboard.

   - View/receive assignments.

   - Inspect instruments.

   - Capture measurements and accuracy tests.

   - Assess results.

   - Make verification decisions.

   - Issue/manage certificates.

   - Maintain inspection and verification history.

Core lifecycle

Implement the application around this lifecycle:

Register → Instrument Record → Verification Request → Inspection → Measurement / Accuracy Tests → Assessment → Verification Decision → Certificate → QR Identity → Public Verification → Renewal / Re-verification

The application's displayed verification state must come from the authoritative application data/state, not from hard-coded UI text.

Data and functionality

Use real application state and persistence for the MVP.

Create the necessary data model around:

- Business

- User

- Instrument

- Verification Request

- Inspection

- Measurement / Test

- Verification Decision

- Certificate

- Verification Authority

- Verifier / Inspector

- QR Identity

- Audit Event

Implement appropriate relationships between these entities.

Important workflows must not be fake, hard-coded, or merely visual.

Permissions and security

Implement role-based access control.

At minimum:

- Business

- Authority / Inspector

- Public

Permissions must be enforced at the application/backend level, not merely by hiding navigation items.

A user must not be able to bypass permissions by manually entering another route.

Do not expose sensitive authority/business functionality to public users.

Measurements and accuracy

Measurement entry must respect the precision and measurement principles defined in the Markdown.

Do not silently round measurement values.

Tolerance/assessment rules must be configurable application data/configuration rather than hard-coded assumptions.

Certificates and QR

Implement certificate records and QR-based public verification.

The public verification experience should make the following understandable:

- What instrument is being verified

- Certificate identity

- Verification status

- Relevant dates

- Verification authority

- Current validity/status

- Any applicable result information

Do not claim that visual elements, QR graphics, colors, seals, badges, or typography are themselves proof of authenticity.

Regulatory safety

This is critical:

Do not invent Indian laws, ministries, departments, statutory requirements, certificate formats, mandatory validity periods, tolerance values, approval processes, or regulatory rules.

Where the design requires regulatory information, make it configurable.

If an example value is necessary for development, clearly treat it as demo/illustrative data and do not present it as an actual legal requirement.

UI / UX

Follow "DESIGN_e-Maap_UPDATED.md" closely.

Preserve its:

- visual language

- design tokens

- typography

- color/status system

- spacing

- component principles

- information hierarchy

- trust-oriented UX

- accessibility requirements

- responsive behavior

- desktop-first approach

- India-focused context

- terminology

- public verification experience

The product should feel like a government-grade, trustworthy, precise verification service, not a generic SaaS dashboard.

Prioritize clarity and trust over decorative UI.

Responsive and accessibility

Use the Markdown's responsive rules, with the desktop design optimized around the specified 1280–1440px range and 1440×900 reference.

Also implement the accessibility requirements specified in the document, targeting WCAG 2.2 AA.

Do not rely on color alone to communicate status.

Include proper:

- keyboard navigation

- focus states

- accessible labels

- form validation

- error messaging

- table behavior

- loading states

- empty states

- success states

- destructive-action confirmations

Routes

Implement the route structure defined in the Markdown, including appropriate public, business, and authority routes.

At minimum, support the conceptual routes for:

- Public home

- Public verification

- Verification result

- Login

- Registration

- Business dashboard

- Business instruments

- Instrument detail

- Business verification requests

- Business certificates

- Authority dashboard

- Authority assignments

- Authority inspections

- Measurement capture

- Authority verification

Route names may be adapted to the framework, but the access boundaries and information architecture must remain.

Build priority

Build in this order:

1. Application foundation + design system

2. Public verification

3. Authentication + role permissions

4. Business workflow

5. Authority / Inspector workflow

6. Measurement and accuracy workflow

7. Certificate + QR verification

8. Dashboards, notifications, reports and supporting functionality

9. Responsive/accessibility refinement

10. End-to-end QA

Important implementation rules

- Do not build unnecessary future features before the MVP works.

- Do not create duplicate visual systems.

- Reuse shared components and design tokens.

- Do not replace the specified UX with generic dashboard patterns.

- Do not use fake functionality where a workflow is presented as working.

- Use clearly identified seed/demo data where needed to demonstrate the application.

- Keep future/extensible functionality separate from the MVP.

- Ensure loading, empty, error, success and network-failure states are intentionally designed.

- Ensure public verification works without authentication.

- Ensure the complete verification lifecycle can be demonstrated end-to-end.

Before finishing

Test the application as all three roles.

Verify that:

1. A Business user can register an instrument.

2. The Business user can request verification.

3. An Authority/Inspector can access the assignment.

4. The Inspector can record measurements/tests.

5. The verification can be assessed and decided.

6. A certificate can be associated with the verified instrument.

7. The instrument/certificate can be verified publicly.

8. Public users do not need to log in.

9. Invalid permissions cannot be bypassed through direct URLs.

10. Verification status is derived from application data.

11. Network/service failure is distinct from certificate invalidity.

12. Measurement precision is preserved.

13. The UI follows the attached design specification.

Start by inspecting the attached Markdown and the existing project structure. Then implement the MVP incrementally rather than generating disconnected screens.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/efaebf1f-fe0c-478c-9ee1-2fc278ba620d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
