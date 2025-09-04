from sqlalchemy import Column, String, DateTime, Boolean, Text, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base

class MetricType(str, enum.Enum):
    COST = "cost"
    USAGE = "usage"
    PERFORMANCE = "performance"
    ERROR = "error"

class ServiceType(str, enum.Enum):
    AWS_EC2 = "aws_ec2"
    AWS_RDS = "aws_rds"
    AWS_S3 = "aws_s3"
    TWILIO = "twilio"
    PAYMENT_GATEWAY = "payment_gateway"
    KYC_API = "kyc_api"
    LEGAL_API = "legal_api"
    OTHER = "other"

class CostMetric(Base):
    __tablename__ = "cost_metrics"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    service_type = Column(Enum(ServiceType), nullable=False)
    metric_type = Column(Enum(MetricType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)
    extra_data = Column(Text, nullable=True)  # JSON string for additional data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CostMetric(service={self.service_type}, amount={self.amount}, period={self.period_start})>"

class BudgetAlert(Base):
    __tablename__ = "budget_alerts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid.uuid4)
    service_type = Column(Enum(ServiceType), nullable=False)
    threshold_amount = Column(Numeric(15, 2), nullable=False)
    threshold_percentage = Column(Numeric(5, 2), nullable=True)  # Percentage of budget
    currency = Column(String(3), default="USD", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    alert_type = Column(String(50), default="warning", nullable=False)  # warning, critical
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    triggered_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<BudgetAlert(service={self.service_type}, threshold={self.threshold_amount}, active={self.is_active})>"
