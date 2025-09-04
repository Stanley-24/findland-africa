from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from app.models.monitoring import MetricType, ServiceType

class CostMetricBase(BaseModel):
    service_type: ServiceType
    metric_type: MetricType
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", max_length=3)
    period_start: datetime
    period_end: datetime
    description: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class CostMetricCreate(CostMetricBase):
    pass

class CostMetricInDB(CostMetricBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class CostMetric(CostMetricInDB):
    pass

class BudgetAlertBase(BaseModel):
    service_type: ServiceType
    threshold_amount: Decimal = Field(..., gt=0)
    threshold_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    currency: str = Field(default="USD", max_length=3)
    alert_type: str = Field(default="warning", max_length=50)

class BudgetAlertCreate(BudgetAlertBase):
    pass

class BudgetAlertUpdate(BaseModel):
    threshold_amount: Optional[Decimal] = Field(None, gt=0)
    threshold_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None
    alert_type: Optional[str] = Field(None, max_length=50)

class BudgetAlertInDB(BudgetAlertBase):
    id: str
    is_active: bool
    created_at: datetime
    triggered_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BudgetAlert(BudgetAlertInDB):
    pass

class CostSummary(BaseModel):
    total_cost: Decimal
    currency: str
    period_start: datetime
    period_end: datetime
    service_breakdown: Dict[str, Decimal]
    budget_utilization: Decimal  # Percentage
    alerts_triggered: int

class BudgetStatus(BaseModel):
    monthly_budget: Decimal
    current_spend: Decimal
    projected_spend: Decimal
    utilization_percentage: Decimal
    days_remaining: int
    status: str  # healthy, warning, critical
    alerts: list[BudgetAlert]
