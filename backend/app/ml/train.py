"""
ML Document Classification Training Pipeline
Personal AI Knowledge Assistant

Classifies documents into 6 target categories:
- Study Material
- Resume/Career
- Research Paper
- Project
- Assignment
- Personal Notes

Model: TF-IDF Vectorizer + Logistic Regression (scikit-learn)
Saves:
- Model artifact: data/models/document_classifier.joblib
- Evaluation results: data/models/classification_metrics.json
"""

import os
import json
import joblib
from datetime import datetime, timezone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

CATEGORIES = [
    "Study Material",
    "Resume/Career",
    "Research Paper",
    "Project",
    "Assignment",
    "Personal Notes"
]

def generate_synthetic_dataset():
    """
    Generates a rich, labeled synthetic dataset covering the 6 target categories
    with realistic domain-specific vocabulary, phrasing, and structure.
    """
    data = []

    # 1. Study Material
    study_material = [
        "Chapter 4: Operating System Concurrency and Deadlocks. In this textbook chapter we review mutual exclusion, semaphores, monitors, and the four conditions required for deadlock: mutual exclusion, hold and wait, no preemption, and circular wait. Review questions and practice exercises follow.",
        "Lecture 12: Introduction to Discrete Mathematics and Graph Theory. Definitions: A graph G = (V, E) consists of a set of vertices V and edges E. An Eulerian path traverses every edge exactly once. Theorem 12.1 and proof by induction are presented in section 3.",
        "Biology 101 Lecture Notes: Cellular Respiration and Photosynthesis. Glycolysis takes place in the cytoplasm, breaking down glucose into pyruvate and producing 2 ATP and 2 NADH. The citric acid cycle and oxidative phosphorylation follow in the mitochondrial matrix.",
        "Principles of Macroeconomics Study Guide - Final Exam Review. Topics include Keynesian economics vs Classical economics, IS-LM curves, monetary policy, fiscal stimulus, GDP calculation (expenditure and income approaches), inflation, and the Phillips Curve.",
        "Data Structures and Algorithms Cheat Sheet: Big-O notation, asymptotic analysis. Hash tables have average O(1) lookup time, worst case O(n). Binary search trees have O(log n) height in balanced AVL and Red-Black trees. Dijkstra's shortest path algorithm runs in O((V + E) log V).",
        "Linear Algebra Study Notes: Vector spaces, subspaces, linear independence, basis and dimension. The Rank-Nullity Theorem states that for any linear map T: V -> W, rank(T) + nullity(T) = dim(V). Eigenvalues and eigenvectors review for midterm.",
        "Organic Chemistry Reaction Mechanisms: Nucleophilic substitution (SN1 vs SN2), elimination reactions (E1 and E2). Markovnikov's rule and anti-Markovnikov addition of HBr in the presence of peroxides. Synthesis flashcards for exam preparation.",
        "Physics 201: Maxwell's Equations and Electromagnetic Waves. Gauss's law for electricity and magnetism, Faraday's law of induction, and Ampere-Maxwell law with displacement current. Wave equations in vacuum and speed of light derivation.",
        "Introduction to Microeconomics Textbook Summary: Supply and demand equilibrium, price elasticity of demand, consumer surplus, producer surplus, deadweight loss under taxation, monopoly deadweight loss and price discrimination.",
        "World History Course Packet: The Renaissance and Reformation. Humanism in Italy, the invention of the printing press by Gutenberg, Martin Luther's Ninety-Five Theses, and the Council of Trent. Study guide for Unit 3 test.",
        "Introduction to Computer Networks Study Guide: The OSI 7-layer model vs TCP/IP stack. Physical layer, Data link (Ethernet, MAC addressing), Network (IP, ICMP, routing protocols OSPF and BGP), Transport (TCP three-way handshake, UDP), and Application layers.",
        "Calculus II Revision Summary: Integration by parts, trigonometric substitutions, partial fraction decomposition, improper integrals, and tests for convergence of infinite series (Ratio test, Root test, Alternating series test).",
        "Cognitive Psychology Study Guide: Memory models, Atkinson-Shiffrin multi-store model, sensory memory, short-term memory capacity (Miller's 7+-2), working memory model by Baddeley and Hitch, long-term memory explicit vs implicit.",
        "Database Systems Course Notes: Relational algebra operations, selection, projection, Cartesian product, theta join, natural join. Normalization forms: 1NF, 2NF, 3NF, BCNF. ACID properties of database transactions: Atomicity, Consistency, Isolation, Durability.",
        "Machine Learning Fundamentals - Study Notes: Supervised vs unsupervised learning. Bias-variance tradeoff, cross-validation, regularization (L1 Lasso, L2 Ridge). Gradient descent optimization, learning rates, loss functions including cross-entropy and mean squared error.",
        "Midterm Exam Study Guide: Fundamentals of Software Engineering. Object-oriented design patterns (Singleton, Factory, Observer, Strategy). SOLID principles, Clean Code guidelines, and test-driven development methodologies.",
        "Textbook Chapter Summary: General Chemistry Chapter 8 - Periodic Trends, Ionization Energy, Electron Affinity, and Electronegativity. Key concepts to memorize before the final examination.",
        "Neuroscience Lecture Handout: Action potential propagation, voltage-gated sodium channels, myelin sheath, saltatory conduction, neurotransmitters (GABA, glutamate, dopamine, serotonin), and synaptic plasticity.",
        "Art History Revision Notes: The Baroque era vs Neoclassicism. High contrast chiaroscuro in Caravaggio's works, Bernini's sculptures, and the transition to the French Enlightenment aesthetics.",
        "Statistics and Probability Course Review: Random variables, expectation, variance, covariance. Probability distributions: Binomial, Poisson, Normal, Central Limit Theorem, confidence intervals, and hypothesis testing (z-test, t-test)."
    ]
    for s in study_material:
        data.append({"text": s, "category": "Study Material"})

    # 2. Resume/Career
    resume_career = [
        "John Doe - Senior Software Engineer. Contact: john.doe@email.com | (555) 019-2834 | LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe. Professional Summary: Results-driven engineer with 7+ years of experience architecting cloud-native distributed microservices.",
        "Curriculum Vitae - Jane Smith, Ph.D. Education: Ph.D. in Computer Science, Stanford University. Experience: Senior Machine Learning Research Scientist at DeepAI Labs. Skills: PyTorch, TensorFlow, distributed training, transformer architectures, CUDA. Publications and patents list attached.",
        "Work Experience: Full Stack Developer at Acme Corp (2021-Present). Led a team of 6 engineers to re-platform company SaaS portal using React, Node.js, and PostgreSQL. Reduced page load latency by 45% and improved uptime to 99.99%.",
        "Technical Skills & Proficiencies: Programming Languages: Python, JavaScript, TypeScript, Go, Java, C++. Frameworks: FastAPI, React, Next.js, Express, Spring Boot. Cloud & DevOps: AWS (EC2, S3, RDS, Lambda), Docker, Kubernetes, CI/CD pipelines (GitHub Actions).",
        "Cover Letter: Dear Hiring Manager, I am writing to express my strong interest in the Lead Cloud Architect position at Tech Innovations. With over a decade of hands-on experience designing fault-tolerant AWS architectures and managing engineering teams, I am confident in my ability to drive results.",
        "Professional Experience: Product Manager at FinTech Global (2019-2023). Spearheaded end-to-end product strategy for digital payments processing over $2B annually. Conducted user interviews, defined OKRs and KPIs, and collaborated across design, QA, and executive stakeholders.",
        "Resume - Emily Johnson. Education: B.S. in Data Science, University of California, Berkeley, Magna Cum Laude. Relevant Coursework: Applied Statistics, Deep Learning, Natural Language Processing. Certifications: AWS Certified Solutions Architect, Google Professional Data Engineer.",
        "Career Objective: Passionate frontend engineer seeking a challenging role building responsive, accessible web applications. Proven track record in TypeScript, Tailwind CSS, Redux, and modern design systems.",
        "Employment History: DevOps & Site Reliability Engineer at CloudScale Inc. Architected Kubernetes clusters on GKE, configured Prometheus and Grafana monitoring alerts, and automated multi-region disaster recovery runbooks.",
        "Candidate Summary: Senior Cybersecurity Analyst with CISSP certification. Expertise in threat modeling, penetration testing, SIEM operations (Splunk), incident response, zero-trust architecture, and SOC 2 Type II compliance.",
        "Professional Qualifications: 5+ years in Financial Accounting & Audit. CPA certified. Proficient in SAP ERP, QuickBooks, financial modeling, GAAP compliance, and internal risk controls. Managed annual audits for Fortune 500 clients.",
        "Career Highlights: Increased customer conversion rate by 32% through iterative A/B testing on landing page funnels. Promoted to Senior Engineering Lead within 18 months. Mentored 8 junior and mid-level software developers.",
        "Executive Summary - Chief Technology Officer (CTO). Strategic technology executive with 15+ years driving digital transformation, enterprise software scalability, team scaling from 10 to 120 developers, and M&A technical due diligence.",
        "Resume: Alex Rivera, UI/UX Designer. Portfolio: alexrivera.design. Tools: Figma, Sketch, Adobe XD, Principle, Webflow. Experience conducting usability testing, creating interactive prototypes, and establishing cross-platform design token systems.",
        "Professional References: 1. Robert Miller - VP of Engineering, TechVentures (robert@techventures.com). 2. Sarah Connor - Principal Architect, Horizon Systems (sarah.connor@horizon.io).",
        "Work History: Data Analyst at MarketGrowth LLC (2020-2022). Extracted and transformed large scale datasets using SQL and dbt. Built executive Tableau dashboards tracking customer churn, LTV, and CAC metrics.",
        "Resume Section: Honors and Awards. Dean's Honor List (all 8 semesters), 1st Place Winner at HackMIT 2023, recipient of the National Merit Scholarship and IEEE outstanding student paper award.",
        "Job Application Profile: Seeking Senior Backend Engineer positions. 6 years hands-on experience in high-throughput distributed systems, Kafka, Redis caching, gRPC, and microservice container orchestration.",
        "Curriculum Vitae - Dr. Marcus Vance. Academic appointments: Assistant Professor of Electrical Engineering, MIT. Industry Consulting: Intel, Qualcomm. Teaching and curriculum development portfolio attached.",
        "Professional Development & Certifications: Certified Scrum Master (CSM), AWS Certified DevOps Engineer Professional, HashiCorp Certified Terraform Associate, Certified Information Systems Auditor."
    ]
    for s in resume_career:
        data.append({"text": s, "category": "Resume/Career"})

    # 3. Research Paper
    research_paper = [
        "Abstract: Recent advancements in large language models (LLMs) have demonstrated impressive few-shot learning capabilities. However, hallucination and factual inconsistency remain critical challenges. In this paper, we propose a novel retrieval-augmented generation (RAG) framework with dynamic verification. We evaluate our method on three benchmark datasets, achieving a 14.2% improvement in factual precision (p < 0.01).",
        "Introduction: The transformer architecture (Vaswani et al., 2017) has fundamentally reshaped sequence modeling in artificial intelligence. While self-attention mechanisms capture long-range dependencies effectively, their quadratic computational complexity O(N^2) presents a bottleneck for long document comprehension. Prior work has explored sparse attention (Child et al., 2019) and linear approximations.",
        "Methodology: We formulate the optimization problem as a constrained Markov Decision Process (MDP). Let S denote the state space and A denote the action space. The policy network pi_theta is trained using Proximal Policy Optimization (PPO) with a clipped surrogate objective function L^{CLIP}(theta) as defined in Equation 3.",
        "Experimental Results and Discussion: Table 2 compares baseline performance across accuracy, recall, and F1-score. Our proposed model achieves 94.6% accuracy on the test set, outperforming the state-of-the-art baseline by 3.8 percentage points. Ablation studies demonstrate that removing the cross-attention layer leads to a statistically significant degradation.",
        "Related Work: Attention mechanisms were first popularized by Bahdanau et al. (2014) for neural machine translation. Devlin et al. (2018) introduced BERT, demonstrating the power of bidirectional masked language modeling. Radford et al. (2019) scaled autoregressive pretraining to billion-parameter regimes.",
        "Conclusion: In this study, we demonstrated the empirical efficacy of multi-modal contrastive learning for zero-shot medical image classification. Limitations include sensitivity to out-of-distribution noise. Future work will investigate self-supervised curriculum learning and continuous domain adaptation.",
        "References: [1] Y. LeCun, Y. Bengio, and G. Hinton. Deep learning. Nature, 521(7553):436-444, 2015. [2] A. Vaswani et al. Attention is all you need. In NeurIPS, pages 5998-6008, 2017. [3] J. Devlin et al. BERT: Pre-training of deep bidirectional transformers for language understanding. In NAACL, 2019.",
        "Keywords: Deep Learning, Natural Language Processing, Transformer Networks, Information Retrieval, Vector Embeddings, Representation Learning.",
        "Theorem 4.1: Under assumptions A1-A3, the empirical risk minimizer theta_hat converges almost surely to the optimal parameter theta* with asymptotic convergence rate O(1 / sqrt(n)). Proof: By the Central Limit Theorem and uniform law of large numbers...",
        "Data Collection and Preprocessing: The dataset was collected from 10,000 peer-reviewed articles published between 2015 and 2024. All text was tokenized using the Byte-Pair Encoding (BPE) algorithm with a vocabulary size of 32,000 tokens. Normalization included lowercasing and punctuation stripping.",
        "Statistical Significance Analysis: A paired Student's t-test was conducted to verify that the performance gains were statistically significant. The resulting p-value of 0.003 confirms the null hypothesis can be rejected with 99% confidence level.",
        "Abstract: Quantum computing holds the potential to solve NP-hard combinatorial optimization problems exponentially faster than classical algorithms. In this paper, we analyze the Quantum Approximate Optimization Algorithm (QAOA) on random Max-Cut graphs, proving new approximation ratio bounds at depth p = 3.",
        "Ablation Studies: To isolate the contribution of individual architectural components, we systematically removed: (1) positional encodings, (2) layer normalization, and (3) residual connections. Results shown in Table 4 indicate that layer normalization is essential for training stability.",
        "Ethical Considerations and Broader Impact: As with any foundational AI system, dual-use implications must be scrutinized. We mitigate potential algorithmic bias by filtering toxic subsets and releasing open-source model weights with safety guardrails.",
        "Discussion: While our empirical findings corroborate the theoretical predictions of Smith & Patel (2022), discrepancy arises in high-dimensional manifolds where sparsity assumptions break down. We hypothesize that latent manifold curvature accounts for this variance.",
        "Peer Review Manuscript: An Investigation of Gene Expression Profiles in Triple-Negative Breast Cancer via Single-Cell RNA Sequencing. Authors: H. Zhang, L. Gomez, E. Weiss. Department of Computational Biology, Harvard Medical School.",
        "Experimental Setup: All experiments were conducted on an NVIDIA DGX cluster equipped with 8 A100 GPUs (80GB VRAM each). Models were trained with mixed-precision FP16, AdamW optimizer, and cosine learning rate decay with a 500-step linear warmup.",
        "Proposition 3.2: Let H be a reproducing kernel Hilbert space with positive definite kernel K. Then for all f in H, the representer theorem guarantees that the minimizer of empirical risk admits a finite expansion.",
        "Literature Review on Graph Neural Networks: Graph Convolutional Networks (Kipf & Welling, 2017), Graph Attention Networks (Velickovic et al., 2018), and message-passing neural network paradigms for molecular property prediction.",
        "Quantitative Evaluation Metrics: Models were assessed using Mean Reciprocal Rank (MRR), Normalized Discounted Cumulative Gain at 10 (NDCG@10), Mean Average Precision (MAP), and BLEU-4 for textual coherence."
    ]
    for s in research_paper:
        data.append({"text": s, "category": "Research Paper"})

    # 4. Project
    project = [
        "Project Architecture & Implementation Specification: Autonomous Drone Delivery System. System architecture diagram: Ground station microservices running on AWS ECS, telemetry streaming via MQTT broker, and onboard edge computer running ROS 2 on NVIDIA Jetson Orin. Milestone 1 deliverables and sprint timeline.",
        "README.md: Personal AI Knowledge Assistant. A private ChatGPT web application that allows users to upload custom documents and perform grounded question-answering using RAG. Tech Stack: FastAPI backend, SQLite database, FAISS vector search, React Vite frontend, Tailwind CSS.",
        "Sprint Planning & Deliverables - Q3 Roadmap: Epic 1: Implement user role-based access control (RBAC). Epic 2: Integrate Stripe billing checkout. Epic 3: Redesign customer analytics dashboard. Target completion date: September 30. Assignees: Dev team.",
        "Software Requirements Specification (SRS): E-Commerce Microservices Platform. Functional requirements: Product catalog service, Shopping cart checkout, Order fulfillment worker, Notification webhook service. Non-functional requirements: P99 response time under 150ms at 10,000 concurrent RPS.",
        "Deployment Guide and Docker Compose Setup: To run the project locally, execute `docker-compose up --build`. Services: web (port 3000), api (port 8000), postgres (port 5432), redis (port 6379). Environment variables must be specified in .env.local file.",
        "Project Proposal: Automated Smart Warehouse Inventory Management with IoT Sensors. Executive summary, problem statement, business justification, ROI estimation ($250k savings in year 1), risk assessment, budget breakdown ($45,000 total), and governance framework.",
        "API Design & OpenAPI Specification: Project Sentinel. Base URL: /api/v1/sentinel. Endpoints: GET /sensors/status, POST /alerts/dispatch, PUT /devices/{id}/firmware. Authentication via OAuth2 Bearer token in HTTP Authorization header.",
        "System Architecture Document: Distributed Event Streaming Pipeline. Architecture components: Apache Kafka clusters for high-throughput message ingestion, Apache Flink for real-time windowed aggregations, and ClickHouse for analytical querying.",
        "Database Schema Design - Project Titan: Entity Relationship Diagram (ERD). Tables: users, organizations, subscriptions, audit_logs. Foreign key constraints, compound indexes on (org_id, created_at), and database migration scripts with Alembic.",
        "Project Post-Mortem & Retrospective: Mobile Banking App Launch v2.0. What went well: On-time delivery, zero critical security vulnerabilities. What could be improved: Load testing was conducted too late in staging environment. Action items for next release.",
        "Tech Stack Decision Record (ADR 004): Selecting PostgreSQL over MongoDB for Core Ledger Service. Status: Accepted. Context: Strong transactional ACID guarantees and strict relational integrity required for financial ledgers.",
        "Release Notes - Version 3.4.0. New Features: Added dark mode theme support, integrated Webhook event notifications, improved full-text search indexing speed by 3x. Bug Fixes: Resolved memory leak during bulk CSV export.",
        "Project Charter: AI-Powered Customer Support Chatbot. Project Sponsor: VP of Customer Experience. Project Manager: Sarah Jenkins. Scope: Automate Tier-1 support queries for billing and order tracking. Budget: $75,000.",
        "Infrastructure as Code (IaC) Plan: Terraform scripts for multi-region AWS deployment. Modules include VPC networking, public/private subnets, NAT Gateways, EKS cluster provisioning, and CloudWatch log groups.",
        "Product Design Document: Real-Time Collaborative Whiteboard. Features: Canvas vector rendering with HTML5 Canvas / WebGL, operational transformation / CRDT conflict resolution for concurrent drawing, and room invitation links.",
        "Project Milestone 3 Review: Alpha Prototype Readiness. All core REST endpoints tested, frontend UI mockups implemented, integration tests passing in CI/CD pipeline, ready for stakeholder demo on Friday.",
        "Security Audit Report - Project Shield: Penetration test findings, OWASP Top 10 vulnerability assessment, SQL injection checks, CSRF mitigation, and dependency vulnerability CVE scans.",
        "Project Budget & Resource Allocation Matrix: Engineering headcounts (3 frontend, 4 backend, 1 DevOps), cloud infrastructure monthly spend ($4,200/mo), third-party SaaS licenses, and contingency reserve.",
        "Technical Documentation: High Availability Redis Cluster Deployment. Master-replica replication configuration, Sentinel auto-failover, persistence via RDB snapshots and AOF logs.",
        "Project Kickoff Meeting Deck: Goals, scope boundaries, stakeholder communication cadences, Gantt chart timeline, risk management matrix, and Definition of Done."
    ]
    for s in project:
        data.append({"text": s, "category": "Project"})

    # 5. Assignment
    assignment = [
        "Assignment 3: Implementing a Convolutional Neural Network from Scratch. Course: CS 482 Deep Learning. Due Date: October 15, 2026 at 11:59 PM. Submission Instructions: Submit your Jupyter notebook (`solution.ipynb`) and trained weights to Gradescope. Late policy: -10% per day.",
        "Homework 5 - Algorithm Design and Analysis. Problem 1 (25 points): Prove that the Fractional Knapsack problem exhibits the greedy choice property. Problem 2 (35 points): Design an O(V + E) dynamic programming algorithm for finding the longest path in a Directed Acyclic Graph (DAG).",
        "Chemistry Lab Assignment 4: Acid-Base Titration and pH Curve Analysis. Objective: Determine the concentration of an unknown hydrochloric acid solution using standardized sodium hydroxide. Record your titration volumes, plot the titration curve, and calculate the equivalence point.",
        "Programming Assignment 2: Thread Pool & Web Server in C++. In this assignment, you will implement a multi-threaded HTTP server using POSIX sockets and a thread pool worker queue. Your code must not produce memory leaks when analyzed with Valgrind. Total points: 100.",
        "English Literature Essay Assignment: Compare and contrast the themes of existential dread and isolation in Franz Kafka's 'The Metamorphosis' and Albert Camus's 'The Stranger'. Length: 1,500 - 2,000 words. Format: MLA 9th edition with at least 4 academic citations.",
        "Course Assignment: Database Normalization Problem Set. Given relation R(A, B, C, D, E) with functional dependencies F = {A -> BC, CD -> E, B -> D}: 1. Identify all candidate keys. 2. Determine highest normal form (1NF, 2NF, 3NF, or BCNF). 3. Perform lossless join BCNF decomposition.",
        "Physics Homework 7: Rotational Kinematics and Angular Momentum. Problem set due Thursday in recitation. Show all your work for full credit. Include free body diagrams for each spinning cylinder problem.",
        "Software Engineering Class Project Assignment: Milestone 2 - User Stories and Wireframes. Group submission: Submit a PDF document detailing at least 10 user stories with acceptance criteria, persona definitions, and low-fidelity Balsamiq wireframes.",
        "Assignment Rubric: Total marks: 100. Correctness: 50%. Code style and modularity: 20%. Unit tests and edge case coverage: 20%. Documentation and README: 10%. Submissions after the deadline will not be accepted without prior dean approval.",
        "Math 305 Homework 3: Abstract Algebra. Prove that every subgroup of a cyclic group is cyclic. Exercise 4.12: Find all generators of the cyclic group Z_24 under addition modulo 24.",
        "Final Capstone Assignment Guidelines: Students must submit a 10-page final report detailing their semester research project, including experimental setup, results, and GitHub repository link. Peer review evaluations due next Monday.",
        "Assignment 1: Introduction to Python Scripting. Write a script `parse_logs.py` that reads an Apache access log file, counts the number of 404 errors, and outputs the top 10 requesting IP addresses in CSV format. Due Friday.",
        "Economics Problem Set 4: Game Theory and Nash Equilibrium. Find all pure and mixed strategy Nash equilibria for the following 2x2 payoff matrix: Player 1 (Cooperate, Defect), Player 2 (Cooperate, Defect). Calculate expected payoffs.",
        "History 210 Essay Assignment: The Impact of the Industrial Revolution on Urban Migration. Submit a thesis statement and annotated bibliography with 5 primary sources by next week.",
        "Lab Assignment 6: Digital Logic Design and Verilog Simulation. Implement a 4-bit synchronous binary up/down counter with active-low reset in Verilog HDL. Run testbench simulations and upload waveform screenshots to Canvas.",
        "Biochemistry Homework Assignment 2: Protein Folding Thermodynamics. Answer questions 1 through 8 regarding Gibbs free energy delta G, enthalpy, and hydrophobic interactions in tertiary structure formation.",
        "Assignment 5: Operating System Virtual Memory Page Replacement. Implement FIFO, LRU, and Optimal page replacement algorithms in Java. Compare page fault counts on the reference string provided in class.",
        "Sociology Term Paper Assignment: Analyze contemporary trends in social stratification and income inequality. Minimum 8 peer-reviewed references required. Submit draft to Turnitin by November 12.",
        "Weekly Problem Set 9: Stochastic Processes and Markov Chains. Calculate the stationary transition distribution pi for the 3-state weather model. Show all intermediate transition matrix calculations.",
        "Assignment Due Date Reminder: Machine Learning Assignment 4 (Support Vector Machines and Kernel Methods) is due this Sunday at 23:59 EST. Submit your PDF report and zipped Python code via the course portal."
    ]
    for s in assignment:
        data.append({"text": s, "category": "Assignment"})

    # 6. Personal Notes
    personal_notes = [
        "Personal Journal - Sunday Evening Reflections: Today was a quiet, productive day. Went for a 5km morning run at the park, picked up fresh espresso beans from the corner cafe, and finished reading chapter 3 of Atomic Habits. Feeling centered and ready for the week ahead.",
        "Quick Thoughts & Brain Dump: Ideas for weekend road trip: 1. Pack hiking boots and waterproof jacket. 2. Check tire pressure before highway drive. 3. Download offline Spotify playlists and Google Maps routes. Call mom around 4 PM to check in.",
        "Grocery Shopping List: Almond milk, organic eggs, sourdough bread, avocados, Greek yogurt, spinach, chicken breast, olive oil, dark chocolate, ground coffee, sparkling water, paper towels, dish soap.",
        "Doctor's Appointment Notes: Follow up on routine blood work results with Dr. Henderson on Tuesday at 10:30 AM. Ask about allergy medication alternatives and get prescription refill for eye drops. Bring insurance card and copay.",
        "Personal To-Do List for Today: - Pay electric and water utility bills online. - Take dog to vet for annual vaccinations. - Clean kitchen pantry and organize spice rack. - Reply to David's email about summer reunion dinner.",
        "Workout Log & Fitness Tracker: Monday: Chest and Triceps. Bench press: 4 sets of 8 at 185 lbs. Incline dumbbell press: 3 sets of 10 at 65 lbs. Dips: 3 sets to failure. 20 minutes moderate cardio on elliptical.",
        "Gift Ideas for Sarah's Birthday: - Hardcover edition of that historical fiction novel she mentioned. - Ceramic pour-over coffee dripper. - Cozy wool scarf in lavender or teal. - Scented soy candle set.",
        "Meeting Notes - Catchup with Marcus: Discussed ideas for organizing a monthly community board game night. Marcus will look into booking the library community room on Saturdays. Follow up next Wednesday over lunch.",
        "Apartment Search Notes: Visited 2 apartments today. Unit 4B: Great natural light, hardwood floors, washer/dryer in unit, but rent is slightly higher ($2,200/mo). Unit 2A: Closer to subway station, spacious balcony, but smaller kitchen.",
        "Random Thoughts on Creative Writing: Characters need clear conflicting motivations. Maybe the protagonist isn't looking for revenge, but trying to redeem an old mistake. Setting: a foggy coastal town in late autumn.",
        "Recipe Notes - Grandma's Homemade Pasta Sauce: Heat 3 tbsp olive oil in Dutch oven. Sauté 1 finely diced yellow onion and 4 cloves minced garlic until fragrant. Add 2 cans crushed San Marzano tomatoes, fresh basil, pinch of red pepper flakes, simmer 45 mins.",
        "Packing List for Summer Vacation: Passport, boarding passes, sunglasses, sunscreen SPF 50, swimsuits, linen shirts, comfortable walking sneakers, Kindle e-reader, universal power adapter, portable power bank.",
        "Daily Gratitude Journal: Three things I am grateful for today: 1. A peaceful morning cup of pour-over coffee. 2. A thoughtful call from an old college friend. 3. Crisp autumn weather and colorful trees on my walk.",
        "Car Maintenance Log: Changed engine oil and oil filter at 45,200 miles. Rotated tires and replaced front windshield wipers. Scheduled next service check for 50,000 miles at auto shop.",
        "Financial Budget & Savings Notes: Set aside $600 for emergency fund this month. Cancel unused streaming subscription ($14.99/mo). Review IRA contribution limits for the current tax year.",
        "Home Improvement Checklist: - Replace HVAC air filter upstairs. - Caulk bathroom bathtub seam. - Plant lavender and rosemary in garden planter boxes. - Lubricate squeaky front door hinges with WD-40.",
        "Personal Book Reading List & Notes: 1. 'Thinking, Fast and Slow' by Daniel Kahneman - System 1 fast heuristics vs System 2 deliberative thought. 2. 'Sapiens' by Yuval Noah Harari. 3. 'Deep Work' by Cal Newport.",
        "Weekend Reflection Journal: Great conversation with Dad about family history. Took photos of old family albums to digitize later. Need to make more time for creative hobbies during busy work weeks.",
        "Health & Wellness Log: Slept 7.5 hours, drank 2.5 liters of water, 10,400 daily steps. Meditation session: 15 minutes mindfulness before bed. Energy levels high throughout the afternoon.",
        "Quick Memo to Self: Remember to cancel trial subscription before the 24th. Backup photo library to external hard drive. Schedule dentist appointment for dental cleaning next month."
    ]
    for s in personal_notes:
        data.append({"text": s, "category": "Personal Notes"})

    return data

def train_and_evaluate(save_model=True):
    print("=" * 65)
    print(" Personal AI Knowledge Assistant - Document Classifier Training")
    print("=" * 65)

    data = generate_synthetic_dataset()
    texts = [item["text"] for item in data]
    labels = [item["category"] for item in data]

    print(f"\n[1] Generated {len(data)} labeled synthetic samples across {len(CATEGORIES)} categories:")
    for cat in CATEGORIES:
        count = sum(1 for c in labels if c == cat)
        print(f"    - {cat:<18}: {count} samples")

    # Stratified Train/Test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.20,
        random_state=42,
        stratify=labels
    )
    print(f"\n[2] Stratified Split: {len(X_train)} training samples, {len(X_test)} test samples.")

    # Scikit-learn Pipeline: TF-IDF + Logistic Regression
    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                max_features=4000,
                ngram_range=(1, 2),
                stop_words="english",
                sublinear_tf=True
            )
        ),
        (
            "clf",
            LogisticRegression(
                C=2.0,
                max_iter=1000,
                random_state=42,
                class_weight="balanced"
            )
        )
    ])

    print("\n[3] Fitting TF-IDF + Logistic Regression pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate on test set
    y_pred = pipeline.predict(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    prec_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

    prec_weighted = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec_weighted = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=CATEGORIES).tolist()

    print("\n[4] Evaluation Results on Unseen Test Set:")
    print(f"    Accuracy         : {acc * 100:.2f}%")
    print(f"    Precision (Macro): {prec_macro * 100:.2f}%")
    print(f"    Recall (Macro)   : {rec_macro * 100:.2f}%")
    print(f"    F1 Score (Macro) : {f1_macro * 100:.2f}%")
    print(f"    F1 (Weighted)    : {f1_weighted * 100:.2f}%")

    print("\nPer-Class Breakdown:")
    for cat in CATEGORIES:
        if cat in report:
            c_f1 = report[cat]["f1-score"] * 100
            c_p = report[cat]["precision"] * 100
            c_r = report[cat]["recall"] * 100
            print(f"    - {cat:<18}: F1={c_f1:.1f}% | Precision={c_p:.1f}% | Recall={c_r:.1f}%")

    # Structured evaluation JSON
    eval_results = {
        "model_type": "TF-IDF + Logistic Regression",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "categories": CATEGORIES,
        "total_samples": len(data),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "accuracy": round(acc, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_macro": round(rec_macro, 4),
            "f1_macro": round(f1_macro, 4),
            "precision_weighted": round(prec_weighted, 4),
            "recall_weighted": round(rec_weighted, 4),
            "f1_weighted": round(f1_weighted, 4)
        },
        "per_class_metrics": {
            cat: {
                "precision": round(report[cat]["precision"], 4),
                "recall": round(report[cat]["recall"], 4),
                "f1_score": round(report[cat]["f1-score"], 4),
                "support": report[cat]["support"]
            }
            for cat in CATEGORIES if cat in report
        },
        "confusion_matrix": {
            "labels": CATEGORIES,
            "matrix": cm
        }
    }

    if save_model:
        # Save model artifact
        os.makedirs("data/models", exist_ok=True)
        model_path = os.path.join("data", "models", "document_classifier.joblib")
        joblib.dump(pipeline, model_path)
        print(f"\n[5] Model artifact saved to: {model_path}")

        # Save metrics to JSON file
        metrics_path = os.path.join("data", "models", "classification_metrics.json")
        with open(metrics_path, "w", encoding="utf-8") as f:
            json.dump(eval_results, f, indent=2)
        print(f"    Evaluation metrics saved to: {metrics_path}")

        # Also save evaluation_results.json in app/ml for convenience
        os.makedirs("app/ml", exist_ok=True)
        app_ml_metrics = os.path.join("app", "ml", "evaluation_results.json")
        with open(app_ml_metrics, "w", encoding="utf-8") as f:
            json.dump(eval_results, f, indent=2)
        print(f"    Evaluation results mirror: {app_ml_metrics}")

    print("\nTraining and evaluation finished successfully!")
    return pipeline, eval_results

if __name__ == "__main__":
    train_and_evaluate(save_model=True)
