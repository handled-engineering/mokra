-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CONTRIBUTOR', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "documentation" TEXT NOT NULL,
    "parsedSpec" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockEndpoint" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "requestSchema" JSONB,
    "responseSchema" JSONB,
    "constraints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEndpointContext" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEndpointContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL DEFAULT 'legacy',
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "request" JSONB,
    "response" JSONB,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockworldTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockworldTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestMockServer" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "mockServerId" TEXT NOT NULL,

    CONSTRAINT "TestMockServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestStateRequirement" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "mockServerId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourcePath" TEXT NOT NULL,
    "initialState" JSONB NOT NULL,
    "description" TEXT,

    CONSTRAINT "TestStateRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAssert" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sonataExpression" TEXT NOT NULL,
    "mockServerId" TEXT NOT NULL,
    "targetResourcePath" TEXT,
    "expectedResult" JSONB,

    CONSTRAINT "TestAssert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "logs" TEXT,
    "error" TEXT,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRunAssertResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "assertId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "actualValue" JSONB,
    "expectedValue" JSONB,
    "error" TEXT,

    CONSTRAINT "TestRunAssertResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubId_key" ON "Subscription"("stripeSubId");

-- CreateIndex
CREATE UNIQUE INDEX "MockService_slug_key" ON "MockService"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MockEndpoint_serviceId_method_path_key" ON "MockEndpoint"("serviceId", "method", "path");

-- CreateIndex
CREATE UNIQUE INDEX "UserProject_apiKey_key" ON "UserProject"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEndpointContext_projectId_endpointId_key" ON "ProjectEndpointContext"("projectId", "endpointId");

-- CreateIndex
CREATE INDEX "MockState_projectId_endpointId_resourceType_idx" ON "MockState"("projectId", "endpointId", "resourceType");

-- CreateIndex
CREATE INDEX "MockState_projectId_endpointId_idx" ON "MockState"("projectId", "endpointId");

-- CreateIndex
CREATE UNIQUE INDEX "MockState_projectId_endpointId_resourceType_resourceId_key" ON "MockState"("projectId", "endpointId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "RequestLog_projectId_createdAt_idx" ON "RequestLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "MockworldTest_userId_idx" ON "MockworldTest"("userId");

-- CreateIndex
CREATE INDEX "TestMockServer_testId_idx" ON "TestMockServer"("testId");

-- CreateIndex
CREATE INDEX "TestMockServer_mockServerId_idx" ON "TestMockServer"("mockServerId");

-- CreateIndex
CREATE UNIQUE INDEX "TestMockServer_testId_mockServerId_key" ON "TestMockServer"("testId", "mockServerId");

-- CreateIndex
CREATE INDEX "TestStateRequirement_testId_idx" ON "TestStateRequirement"("testId");

-- CreateIndex
CREATE INDEX "TestAssert_testId_idx" ON "TestAssert"("testId");

-- CreateIndex
CREATE INDEX "TestRun_testId_startedAt_idx" ON "TestRun"("testId", "startedAt");

-- CreateIndex
CREATE INDEX "TestRunAssertResult_runId_idx" ON "TestRunAssertResult"("runId");

-- CreateIndex
CREATE INDEX "TestRunAssertResult_assertId_idx" ON "TestRunAssertResult"("assertId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockEndpoint" ADD CONSTRAINT "MockEndpoint_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MockService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MockService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEndpointContext" ADD CONSTRAINT "ProjectEndpointContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockState" ADD CONSTRAINT "MockState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockworldTest" ADD CONSTRAINT "MockworldTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestMockServer" ADD CONSTRAINT "TestMockServer_testId_fkey" FOREIGN KEY ("testId") REFERENCES "MockworldTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestMockServer" ADD CONSTRAINT "TestMockServer_mockServerId_fkey" FOREIGN KEY ("mockServerId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestStateRequirement" ADD CONSTRAINT "TestStateRequirement_testId_fkey" FOREIGN KEY ("testId") REFERENCES "MockworldTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAssert" ADD CONSTRAINT "TestAssert_testId_fkey" FOREIGN KEY ("testId") REFERENCES "MockworldTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_testId_fkey" FOREIGN KEY ("testId") REFERENCES "MockworldTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunAssertResult" ADD CONSTRAINT "TestRunAssertResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunAssertResult" ADD CONSTRAINT "TestRunAssertResult_assertId_fkey" FOREIGN KEY ("assertId") REFERENCES "TestAssert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
