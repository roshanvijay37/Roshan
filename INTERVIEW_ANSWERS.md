# EDGE IMPORT PROJECT - COMPREHENSIVE INTERVIEW ANSWERS

## 1. MICROSERVICES ARCHITECTURE & RABBITMQ COMMUNICATION

### Architecture Overview
The Edge Import system follows a **microservices architecture** with multiple independent services and workers:

**Services:**
- Alert Service - Handles notifications
- Configuration Service - Manages system configuration
- Corp Service - Corporate data management
- Data Service - Core data operations
- Email Service - Email notifications
- Feed Service - Data feed processing
- File Service - File management
- Key Management Service - Encryption key handling
- Maintenance Service - System maintenance tasks
- Report Service - Report generation
- Scheduling Service - Job scheduling
- Traffic Service - Request routing
- Supervisor - Orchestrates workers

**Workers:**
- Data Worker, Division Worker, File Worker, Format Worker
- Goals Import Worker, Snapshot Documents Worker
- Requisition Template Worker, Resume Worker, Metrics Worker

### RabbitMQ Communication Pattern

**Message Queue Architecture:**
```
File Upload → RabbitMQ Queue → Worker Processes → Validation Steps → Staging → Load → Database
```

**Key Implementation Details:**

1. **Connection Setup** (from Program.cs):
   - Workers connect to RabbitMQ using `IConnection` interface
   - Quality of Service (QoS) configured: `Qos.Workflow.With(parallelism: 4, size: 1000)`
   - Parallelism controls concurrent batch processing
   - Size controls batch size (number of records per batch)

2. **Message Flow:**
   - Messages published to RabbitMQ queues
   - Workers subscribe to specific queues
   - Each message represents a document/record to process
   - Messages flow through defined steps (validate → staging → load)

3. **Worker Pattern:**
   - Workers extend `ImportWorker<T>` base class
   - Define processing steps using `Step()` method
   - Each step processes batches of messages
   - Steps can run in parallel or sequentially

4. **Routing:**
   - `Route.Work.Do.Step("validate")` - Validation routing
   - `Route.Work.Do.Step("staging")` - Staging routing
   - `Route.Work.Do.Step("loadandupdate")` - Load routing
   - Messages routed through workflow based on state

5. **Capacity Control:**
   - `.WithCapacityControl()` limits in-flight records
   - Prevents system overload
   - Controls rate of records entering workflow

**RabbitMQ Configuration:**
- Clustered setup (rabbitmq1, rabbitmq2)
- TCP buffer optimization: 128KB send/receive buffers
- Memory watermark: 60% of available RAM
- Heartbeat and connection management

---

## 2. IMPORT WORKFLOW - FILE UPLOAD TO DATA PERSISTENCE

### Complete Workflow Steps:

**Phase 1: File Upload & Initialization**
1. User uploads file through web interface
2. File stored in FTP location or S3
3. Import job created in MongoDB with metadata
4. Message published to RabbitMQ queue
5. Worker picks up message from queue

**Phase 2: Validation (Parallel Processing)**

From GoalsWorker.cs validation steps:
```
- UserValidationStep: Verify user exists and is active
- DescriptionTitleValidationStep: Validate required fields
- ParentGoalValidationStep: Check parent goal references
- TaskTargetValidationStep: Validate task/target data
- DateValidationStep: Validate date ranges
- ProgressValidationStep: Validate progress values
- TargetValueTypeValidationStep: Validate value types
- TaskTargetParentIdValidationStep: Validate parent relationships
```

**Validation Characteristics:**
- Batch processing (250-1000 records per batch)
- Parallel execution (4-6 batches simultaneously)
- Each validation adds errors to document if failed
- Valid messages proceed, invalid messages marked with errors

**Phase 3: Staging**
```csharp
Step(Route.Work.Do.Step("staging"), qos.With(parallelism: 1), builder =>
{
    builder.Add(WorkerSteps.GoalsStagingStep, GoalsStagingAsync);
});
```

- Sequential processing (parallelism: 1)
- Data written to SQL Server staging tables
- Temporary tables created for bulk operations
- Aggregation of related records (goals with tasks/targets)

**Phase 4: Singularity Point**
- Synchronization checkpoint
- Ensures all validations complete before load
- Prevents partial data commits

**Phase 5: Load & Persistence**
```csharp
Step(Route.Work.Do.Step("loadandupdate"), qos.With(parallelism:6, size: 5), builder =>
{
    builder.Add(WorkerSteps.GoalsLoadStep, LoadGoalsAsync);
});
```

**Load Process:**
1. Read from staging tables using Dapper
2. Construct domain aggregates (GoalAggregateConstructor)
3. Call service APIs (GoalServiceClient)
4. Service validates business rules
5. Data persisted to SQL Server production tables
6. Update MongoDB with job status
7. Clean up staging tables

**Phase 6: Completion**
- Success/failure status updated in MongoDB
- Notifications sent via Alert Service
- Reports generated via Report Service
- Logs written to Splunk

### Data Flow Diagram:
```
Upload → FTP/S3 → MongoDB (metadata) → RabbitMQ → Worker
                                                      ↓
                                                  Validate (parallel)
                                                      ↓
                                                  Staging (SQL temp tables)
                                                      ↓
                                                  Singularity
                                                      ↓
                                                  Load (API calls)
                                                      ↓
                                                  SQL Server (production)
                                                      ↓
                                                  MongoDB (status update)
```

---

## 3. ERROR HANDLING & RETRY MECHANISMS (POLLY)

### Polly Integration

**Configuration:**
```csharp
.With(Retry.Custom(1000, 5000, 20000)) // 26 seconds total
```

**Retry Strategy:**
- First retry: 1 second delay
- Second retry: 5 seconds delay
- Third retry: 20 seconds delay
- Total: 3 attempts over 26 seconds

### Error Handling Layers

**1. Message-Level Error Handling:**
```csharp
private void AddErrorToMessages(IWorkflowReaction workflowReaction, 
    IEnumerable<Message<Document>> messages, 
    string errorKind, 
    string errorMessage)
{
    var document = new Document.Update(Errors[errorKind, errorMessage]);
    workflowReaction.Next(messages, document);
}
```

- Errors attached to individual messages
- Messages continue through workflow with error markers
- Final report shows which records failed and why

**2. Step-Level Error Handling:**
- Try-catch blocks in each validation step
- Transient failures trigger Polly retry
- Permanent failures mark message as invalid
- Circuit breaker prevents cascading failures

**3. Service-Level Error Handling:**
- API calls wrapped in Polly policies
- HTTP transient errors (500, 503) trigger retry
- Timeout policies prevent hanging requests
- Fallback strategies for degraded operation

**4. Database Error Handling:**
- SQL deadlock detection and retry
- Connection pool management
- Transaction rollback on failure
- Staging table cleanup on error

### Error Categories

**Validation Errors (No Retry):**
- User does not exist
- Invalid data format
- Business rule violations
- These are permanent - no retry

**Transient Errors (Retry with Polly):**
- Database connection timeout
- API service unavailable
- Network interruption
- Lock/deadlock in database

**Critical Errors (Fail Fast):**
- Configuration missing
- Authentication failure
- Queue connection lost
- Worker stops and alerts sent

### Error Tracking
- All errors logged to NLog
- Structured JSON logging
- Correlation IDs track requests
- Error metrics sent to Prometheus/Grafana
- Splunk queries for error analysis

---

## 4. DOCKER CONTAINERIZATION SETUP

### Docker Compose Configuration

**Services Defined:**
```yaml
services:
  mongodb:
    image: edgeimport/mongodb
    ports: "27017:27017"
    
  rabbitmq1:
    image: edgeimport/rabbitmq
    ports: "5672:5672", "15672:15672"
    
  rabbitmq2:
    image: edgeimport/rabbitmq
    ports: "5673:5672", "15673:15672"
    environment:
      - CLUSTER_NODENAME=rabbitmq1
    
  grafana:
    image: edgeimport/grafana
    ports: "2280:80"
```

### Container Details

**1. MongoDB Container:**
- Custom Dockerfile in `setup/mongodb/`
- CentOS-based image
- Pre-configured with mongo-express for UI
- Persistent volume for data
- Configuration: `mongod.conf`

**2. RabbitMQ Containers (Clustered):**
- Custom Dockerfile in `setup/rabbitmq/`
- Two-node cluster for high availability
- Management UI on ports 15672/15673
- Custom configuration: `rabbitmq.conf`
- Pre-loaded definitions: `definitions.json`
- Startup script: `rabbitmq-start.sh`

**3. Grafana Container:**
- Custom Dockerfile in `setup/grafana/`
- Pre-configured dashboards:
  - `rabbitmq-metrics_rev3.json`
  - `mongodb_rev2.json`
- Port 2280 for web UI

**4. Prometheus (Commented Out):**
- Metrics collection service
- Can be enabled when needed

### Volume Mounting
```yaml
volumes:
  - /c/Projects/edgeimport/edgeimport-operations:/mnt
```
- Shared volume for logs and data
- Accessible from all containers

### Networking
- All containers on same Docker network
- Service discovery by container name
- Internal communication without port exposure

### Development Workflow
1. `docker-compose up` - Start all services
2. Workers run on host machine (not containerized)
3. Workers connect to containerized RabbitMQ/MongoDB
4. Grafana monitors all services
5. `docker-compose down` - Stop all services

### Production Differences
- Workers also containerized in production
- Kubernetes orchestration (not Docker Compose)
- External MongoDB cluster (not containerized)
- AWS-managed RabbitMQ (Amazon MQ)
- CloudWatch instead of Grafana

---

## 5. AWS INTEGRATION & CLOUD-NATIVE FEATURES

### AWS Services Used

**1. AWS S3 (Simple Storage Service):**
- File storage for import files
- AWSSDK.S3 library
- Pre-signed URLs for secure upload
- Lifecycle policies for cleanup
- Versioning enabled

**2. AWS Lambda:**
- AWSSDK.Lambda integration
- Serverless function invocation
- Event-driven processing
- Used for lightweight transformations

**3. AWS STS (Security Token Service):**
- Temporary credential generation
- AWSSDK.SecurityToken
- Role assumption for cross-account access
- Implementation: `Cornerstone.AwsSts`

**4. AWS KMS (Key Management Service):**
- AWSSDK.KeyManagementService
- Encryption key management
- Data encryption at rest
- Envelope encryption pattern

**5. AWS Systems Manager Parameter Store:**
- AWSSDK.SimpleSystemsManagement
- Configuration management
- Secrets storage
- Dynamic configuration updates

**6. AWS IAM (Identity and Access Management):**
- Role-based access control
- Service-to-service authentication
- Least privilege principle
- Resource-based policies

### Cloud-Native Patterns

**1. Token Management:**
```csharp
services.AddStsAWSService<IAmazonLambda>("perf-iam-adfs-role", 
    ResourceNameFormatters.PrefixWithRegionAccountShortAliasResourceName);
```
- Automatic token refresh
- `IInternalTokenProvider` interface
- `InternalTokenRefreshService` implementation
- Tokens cached and rotated

**2. Service Discovery:**
```json
"ServiceRegistrationBase": "http://consul.qarh01.services.us-west-2.us-int-micro-qa-h01.csodaws:8500/v1"
```
- Consul integration
- Dynamic service endpoints
- Health checks
- Load balancing

**3. Configuration Management:**
```csharp
services.AddEnvironmentConfiguration(config);
services.ConfigureUnderSection<ServicesHostingOptions>(config);
```
- Environment-specific configs
- appsettings.json hierarchy
- AWS Parameter Store integration
- Configuration service for centralized management

**4. Resilience Patterns:**
- Circuit breaker (Polly)
- Retry with exponential backoff
- Timeout policies
- Bulkhead isolation

**5. Observability:**
- Structured logging to CloudWatch
- X-Ray tracing integration
- Custom metrics to CloudWatch
- Correlation IDs for distributed tracing

### AWS Resource Naming
```csharp
services.AddScoped<IArnBuilder, ArnBuilder>();
```
- ARN (Amazon Resource Name) construction
- Region-aware resource naming
- Account-specific prefixes
- Consistent naming conventions

### Authentication Flow
1. Application starts with IAM role
2. STS assumes role for specific service
3. Temporary credentials obtained (15 min - 12 hours)
4. Credentials used for AWS API calls
5. Token refresh before expiration
6. Audit trail in CloudTrail

### Multi-Region Support
- Region configuration in appsettings
- Cross-region replication for S3
- Regional endpoints for services
- Failover capabilities

