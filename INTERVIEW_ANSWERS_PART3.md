# EDGE IMPORT PROJECT - INTERVIEW ANSWERS (PART 3)

## 9. TESTING STRATEGIES & CODE QUALITY

### Testing Framework Stack

**Unit Testing:**
- **xUnit** - Primary testing framework
- **NUnit** - Alternative framework (some projects)
- **Moq** - Mocking framework for dependencies
- **FluentAssertions** - Readable assertions

**Code Coverage:**
- **Coverlet** - .NET Core coverage tool
- **DotCover** - JetBrains coverage analysis
- Target: 80%+ coverage
- Configuration: `DotCover.xml`, `UnitTestAssemblies.xml`

### Test Project Structure

**Example from Goals Import:**
```
Goals.Import.Tests/
├── Contracts.Tests/      # Contract validation tests
├── Infrastructure.Tests/ # Repository and client tests
├── Worker.Tests/         # Worker logic tests
└── Integration.Tests/    # End-to-end tests
```

**Snapshot Documents Tests:**
```
snapshot.documents.worker.test/
├── Worker/
│   ├── Extensions/
│   └── Steps/
└── Data/
```

### Unit Testing Approach

**1. Worker Step Testing:**
```csharp
[Fact]
public async Task UserValidation_ValidUser_PassesValidation()
{
    // Arrange
    var mockUserService = new Mock<IUserServiceClient>();
    mockUserService.Setup(x => x.GetUserAsync(It.IsAny<int>()))
        .ReturnsAsync(new User { IsActive = true });
    
    var worker = new GoalsWorker(/* dependencies */);
    var messages = CreateTestMessages();
    
    // Act
    await worker.UserValidationAsync("portal", messages, mockReaction.Object);
    
    // Assert
    mockReaction.Verify(x => x.Next(messages), Times.Once);
}

[Fact]
public async Task UserValidation_InactiveUser_AddsError()
{
    // Arrange
    var mockUserService = new Mock<IUserServiceClient>();
    mockUserService.Setup(x => x.GetUserAsync(It.IsAny<int>()))
        .ReturnsAsync(new User { IsActive = false });
    
    // Act
    await worker.UserValidationAsync("portal", messages, mockReaction.Object);
    
    // Assert
    mockReaction.Verify(x => x.Next(
        It.IsAny<IEnumerable<Message<Document>>>(), 
        It.Is<Document.Update>(d => d.HasError("UserIsInactive"))), 
        Times.Once);
}
```

**2. Repository Testing:**
```csharp
[Fact]
public async Task GetGoalStagingEntities_ReturnsCorrectData()
{
    // Arrange
    var connectionString = TestDatabase.ConnectionString;
    var repo = new GoalStagingEntityRepo(connectionString);
    await SeedTestData();
    
    // Act
    var entities = await repo.GetGoalStagingEntitiesAsync(
        "testportal", fileId, documentIds, entityIds);
    
    // Assert
    entities.Should().HaveCount(5);
    entities.First().GoalTitle.Should().Be("Test Goal");
}
```

**3. Service Client Testing:**
```csharp
[Fact]
public async Task LoadGoalAggregates_SuccessfulLoad_ReturnsValidResponse()
{
    // Arrange
    var mockHttpClient = new Mock<IHttpClientFactory>();
    var client = new GoalServiceClient(mockHttpClient.Object);
    var aggregates = CreateTestAggregates();
    
    // Act
    var responses = await client.LoadGoalAggregatesAsync(
        serviceContext, aggregates, CancellationToken.None);
    
    // Assert
    responses.Should().AllSatisfy(r => r.Errors.Should().BeEmpty());
}
```

### Integration Testing

**1. End-to-End Workflow Tests:**
```csharp
[Fact]
public async Task CompleteImportWorkflow_ValidFile_SuccessfullyProcesses()
{
    // Arrange
    var testFile = CreateTestCsvFile();
    var worker = CreateWorkerWithRealDependencies();
    
    // Act
    await worker.ProcessFileAsync(testFile);
    
    // Assert
    var jobStatus = await GetJobStatusFromMongoDB();
    jobStatus.Status.Should().Be("Completed");
    jobStatus.ValidRecords.Should().Be(100);
    jobStatus.ErrorRecords.Should().Be(0);
    
    var dbRecords = await GetRecordsFromSqlServer();
    dbRecords.Should().HaveCount(100);
}
```

**2. Database Integration Tests:**
```csharp
[Collection("DatabaseCollection")]
public class RepositoryIntegrationTests : IDisposable
{
    private readonly TestDatabaseFixture _fixture;
    
    public RepositoryIntegrationTests(TestDatabaseFixture fixture)
    {
        _fixture = fixture;
    }
    
    [Fact]
    public async Task BulkInsert_LargeDataSet_PerformsEfficiently()
    {
        // Test with 10,000 records
        var stopwatch = Stopwatch.StartNew();
        await repo.BulkInsertAsync(largeDataSet);
        stopwatch.Stop();
        
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(5000);
    }
}
```

### Code Quality Tools

**1. Cornerstone.CodeAnalysis:**
```xml
<PackageReference Include="Cornerstone.CodeAnalysis" Version="2.0.0" />
```
- Custom analyzers for company standards
- Enforces coding conventions
- Detects common mistakes
- Build-time validation

**2. Static Analysis:**
- **Roslyn Analyzers** - Built-in C# analysis
- **StyleCop** - Code style enforcement
- **FxCop** - Framework design guidelines
- **SonarQube** - Comprehensive analysis

**3. Code Review Process:**
- Pull request required
- Minimum 2 reviewers
- Automated checks must pass
- Code coverage threshold enforced

### Test Data Management

**1. Test Fixtures:**
```csharp
public class TestDataBuilder
{
    public static Message<Document>[] CreateGoalMessages(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new Message<Document>
            {
                content = new Document
                {
                    _id = Guid.NewGuid().ToString(),
                    data = new Dictionary<string, object>
                    {
                        ["user_id"] = i,
                        ["goal_title"] = $"Goal {i}",
                        ["goal_entity_type"] = "goal"
                    }
                }
            })
            .ToArray();
    }
}
```

**2. Database Seeding:**
```csharp
public class TestDatabaseSeeder
{
    public async Task SeedAsync()
    {
        await SeedUsers();
        await SeedGoals();
        await SeedCategories();
        await SeedPerspectives();
    }
}
```

### Performance Testing

**1. Load Testing:**
```csharp
[Fact]
public async Task ProcessLargeFile_10000Records_CompletesInTime()
{
    var messages = CreateTestMessages(10000);
    var stopwatch = Stopwatch.StartNew();
    
    await worker.ProcessAsync(messages);
    
    stopwatch.Stop();
    stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromMinutes(5));
}
```

**2. Stress Testing:**
- Simulate high concurrency
- Test queue backup scenarios
- Verify graceful degradation
- Monitor resource usage

### Continuous Integration

**Build Pipeline:**
1. Code checkout
2. Restore NuGet packages
3. Build solution
4. Run unit tests
5. Run integration tests
6. Code coverage analysis
7. Static analysis
8. Package artifacts
9. Deploy to test environment

**Quality Gates:**
- All tests must pass
- Code coverage > 80%
- No critical security issues
- No code smells (SonarQube)
- Performance benchmarks met

### Test Naming Convention
```csharp
// Pattern: MethodName_Scenario_ExpectedBehavior
[Fact]
public async Task LoadGoals_InvalidParentGoal_AddsParentGoalNotFoundError()

[Fact]
public async Task ValidateUser_UserDoesNotExist_ReturnsValidationError()

[Fact]
public async Task StagingStep_DuplicateEntityId_ThrowsException()
```

---

## 10. SCALABILITY CONSIDERATIONS

### Worker Scaling

**Horizontal Scaling:**
```csharp
// QoS Configuration
.WithComponent<GoalsWorker>(
    GoalsWorker.WorkerName, 
    Qos.Workflow.With(parallelism: 4, size: 1000))
```

**Scaling Strategy:**
1. **Single Worker Instance:**
   - Parallelism: 4 batches
   - Batch size: 1000 records
   - Throughput: ~4000 records/minute

2. **Multiple Worker Instances:**
   - Deploy 5 workers across servers
   - Each processes 4 batches in parallel
   - Total: 20 batches simultaneously
   - Throughput: ~20,000 records/minute

3. **Auto-Scaling:**
   - Monitor queue depth
   - Scale up when depth > 5000
   - Scale down when depth < 1000
   - Min instances: 2 (HA)
   - Max instances: 10

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goals-import-worker
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: worker
        image: edgeimport/goals-worker:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: goals-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: goals-import-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: rabbitmq_queue_messages
      target:
        type: AverageValue
        averageValue: "5000"
```

### Message Queue Scaling

**RabbitMQ Clustering:**
```
rabbitmq1 ←→ rabbitmq2 ←→ rabbitmq3
```

**Benefits:**
- High availability
- Load distribution
- Failover capability
- Increased throughput

**Queue Configuration:**
```json
{
  "queues": [{
    "name": "goals.import.validate",
    "durable": true,
    "arguments": {
      "x-max-length": 100000,
      "x-message-ttl": 86400000,
      "x-queue-mode": "lazy"
    }
  }]
}
```

**Lazy Queues:**
- Messages stored on disk
- Reduced memory usage
- Better for large queues
- Slight latency trade-off

**Sharding:**
```
goals.import.validate.shard1
goals.import.validate.shard2
goals.import.validate.shard3
```
- Distribute load across queues
- Workers subscribe to specific shards
- Hash-based routing

### Database Scaling

**SQL Server:**

**1. Read Replicas:**
```
Primary (Write) → Replica1 (Read)
                → Replica2 (Read)
```
- Validation queries to replicas
- Load operations to primary
- Reduced primary load

**2. Table Partitioning:**
```sql
CREATE PARTITION FUNCTION GoalDatePartition (DATETIME)
AS RANGE RIGHT FOR VALUES 
    ('2024-01-01', '2024-02-01', '2024-03-01', ...);

CREATE PARTITION SCHEME GoalDateScheme
AS PARTITION GoalDatePartition
TO (FG_2024_01, FG_2024_02, FG_2024_03, ...);

CREATE TABLE Goals (
    GoalId INT,
    StartDate DATETIME,
    ...
) ON GoalDateScheme(StartDate);
```

**3. Indexing Strategy:**
```sql
-- Covering index for common queries
CREATE NONCLUSTERED INDEX IX_Goals_UserId_Status
ON Goals(UserId, Status)
INCLUDE (GoalTitle, StartDate, EndDate);

-- Filtered index for active records
CREATE NONCLUSTERED INDEX IX_Goals_Active
ON Goals(UserId)
WHERE Status = 'Active';
```

**MongoDB:**

**1. Sharding:**
```javascript
sh.enableSharding("edgeimport")
sh.shardCollection("edgeimport.importjobs", { "portal": 1, "_id": 1 })
```

**2. Replica Set:**
```
Primary → Secondary1
       → Secondary2
       → Arbiter
```

**3. Indexes:**
```javascript
db.importjobs.createIndex({ "portal": 1, "status": 1, "createdDate": -1 })
db.importjobs.createIndex({ "fileId": 1 })
db.importjobs.createIndex({ "createdDate": 1 }, { expireAfterSeconds: 2592000 })
```

### Capacity Control

**Implementation:**
```csharp
.WithCapacityControl()
```

**Purpose:**
- Limit in-flight records
- Prevent memory exhaustion
- Control processing rate
- Backpressure mechanism

**Configuration:**
```csharp
public class CapacityControlSettings
{
    public int MaxInFlightRecords { get; set; } = 50000;
    public int MaxRecordsPerSecond { get; set; } = 10000;
    public int PartitionCapacity { get; set; } = 10000;
}
```

**Behavior:**
- When capacity reached, worker pauses consumption
- Messages remain in queue
- Resume when capacity available
- Prevents OOM errors

### Caching Strategy

**1. In-Memory Caching:**
```csharp
.With<ObjectCache>(c => new MemoryCache(GoalsWorker.WorkerName))
```

**Cached Data:**
- File settings (10 min TTL)
- Workflow settings (3 min TTL)
- Schema definitions (10 min TTL)
- Perspectives (30 sec TTL)
- Categories (30 sec TTL)
- FTP paths (10 min TTL)

**2. Distributed Caching:**
- Redis for shared cache
- Session state
- Rate limiting counters
- Distributed locks

### Performance Optimizations

**1. Batch Processing:**
```csharp
// Validation: 250 records/batch
qos.With(size: 250)

// Staging: 500 records/batch
qos.With(size: 500)

// Load: 5 records/batch (API calls)
qos.With(size: 5)
```

**2. Parallel Processing:**
```csharp
// Validation: 4 batches in parallel
qos.With(parallelism: 4)

// Load: 6 batches in parallel
qos.With(parallelism: 6)
```

**3. Bulk Operations:**
```csharp
// SQL Bulk Copy
SqlBulkCopy bulkCopy = new SqlBulkCopy(connection);
bulkCopy.BatchSize = 1000;
bulkCopy.BulkCopyTimeout = 300;

// Bulk API calls
var responses = await goalServiceClient.LoadGoalAggregatesAsync(
    serviceContext, 
    goalAggregates, // Batch of 5
    cancellationToken);
```

### Monitoring for Scale

**Key Metrics:**
```
- Queue depth (alert > 10,000)
- Processing rate (records/sec)
- Worker CPU/Memory usage
- Database connection pool
- API response times
- Error rates
- Throughput trends
```

**Auto-Scaling Triggers:**
- Queue depth > 5000: Scale up
- CPU > 70%: Scale up
- Memory > 80%: Scale up
- Queue depth < 1000 for 10 min: Scale down
- CPU < 30% for 10 min: Scale down

### Bottleneck Identification

**Common Bottlenecks:**

1. **Database:**
   - Solution: Read replicas, indexing, query optimization

2. **API Calls:**
   - Solution: Increase parallelism, batch requests, caching

3. **Network:**
   - Solution: Compression, connection pooling, regional deployment

4. **Memory:**
   - Solution: Reduce batch size, streaming, garbage collection tuning

5. **Queue:**
   - Solution: Clustering, sharding, lazy queues

### Future Scalability

**Planned Improvements:**
1. Event-driven architecture (AWS EventBridge)
2. Serverless workers (AWS Lambda)
3. Stream processing (Kafka/Kinesis)
4. GraphQL for flexible queries
5. CQRS pattern for read/write separation
6. Event sourcing for audit trail

---

## SUMMARY - KEY INTERVIEW TALKING POINTS

1. **Microservices with RabbitMQ** - Decoupled, scalable, message-driven architecture
2. **Multi-phase workflow** - Validate → Stage → Load with parallel processing
3. **Polly for resilience** - Retry, circuit breaker, timeout policies
4. **Docker for local dev** - Containerized dependencies, easy setup
5. **AWS cloud-native** - S3, Lambda, STS, KMS, Parameter Store
6. **Hybrid database** - MongoDB for metadata, SQL Server for business data
7. **Comprehensive monitoring** - Grafana, Prometheus, Splunk, structured logging
8. **Security-first** - Token management, STS, KMS, least privilege
9. **Test-driven** - Unit, integration, performance tests with 80%+ coverage
10. **Horizontally scalable** - Worker scaling, queue clustering, database replication

