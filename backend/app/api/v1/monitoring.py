from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.monitoring import CostMetric, BudgetAlert, ServiceType, MetricType
from app.models.user import User
from app.schemas.monitoring import (
    CostMetricCreate, CostMetric as CostMetricSchema,
    BudgetAlertCreate, BudgetAlertUpdate, BudgetAlert as BudgetAlertSchema,
    CostSummary, BudgetStatus
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.post("/cost-metrics", response_model=CostMetricSchema, status_code=http_status.HTTP_201_CREATED)
def create_cost_metric(
    metric: CostMetricCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new cost metric (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can create cost metrics"
        )
    
    db_metric = CostMetric(
        service_type=metric.service_type,
        metric_type=metric.metric_type,
        amount=metric.amount,
        currency=metric.currency,
        period_start=metric.period_start,
        period_end=metric.period_end,
        description=metric.description,
        extra_data=str(metric.extra_data) if metric.extra_data else None
    )
    
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    
    return db_metric

@router.get("/cost-metrics", response_model=List[CostMetricSchema])
def list_cost_metrics(
    service_type: Optional[ServiceType] = Query(None, description="Filter by service type"),
    metric_type: Optional[MetricType] = Query(None, description="Filter by metric type"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List cost metrics (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can view cost metrics"
        )
    
    query = db.query(CostMetric)
    
    # Apply filters
    if service_type:
        query = query.filter(CostMetric.service_type == service_type)
    if metric_type:
        query = query.filter(CostMetric.metric_type == metric_type)
    if start_date:
        query = query.filter(CostMetric.period_start >= start_date)
    if end_date:
        query = query.filter(CostMetric.period_end <= end_date)
    
    # Apply pagination
    metrics = query.order_by(CostMetric.created_at.desc()).offset(skip).limit(limit).all()
    
    return metrics

@router.get("/cost-summary", response_model=CostSummary)
def get_cost_summary(
    start_date: Optional[datetime] = Query(None, description="Start date for summary"),
    end_date: Optional[datetime] = Query(None, description="End date for summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cost summary for a period (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can view cost summaries"
        )
    
    # Default to current month if no dates provided
    if not start_date:
        start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Get cost metrics for the period
    metrics = db.query(CostMetric).filter(
        CostMetric.metric_type == MetricType.COST,
        CostMetric.period_start >= start_date,
        CostMetric.period_end <= end_date
    ).all()
    
    # Calculate totals
    total_cost = sum(metric.amount for metric in metrics)
    service_breakdown = {}
    
    for metric in metrics:
        service_name = metric.service_type.value
        if service_name not in service_breakdown:
            service_breakdown[service_name] = Decimal('0')
        service_breakdown[service_name] += metric.amount
    
    # Calculate budget utilization (assuming $500 monthly budget)
    monthly_budget = Decimal('500')
    budget_utilization = (total_cost / monthly_budget) * 100 if monthly_budget > 0 else Decimal('0')
    
    # Count triggered alerts
    alerts_triggered = db.query(BudgetAlert).filter(
        BudgetAlert.triggered_at.isnot(None),
        BudgetAlert.resolved_at.is_(None)
    ).count()
    
    return CostSummary(
        total_cost=total_cost,
        currency="USD",
        period_start=start_date,
        period_end=end_date,
        service_breakdown=service_breakdown,
        budget_utilization=budget_utilization,
        alerts_triggered=alerts_triggered
    )

@router.post("/budget-alerts", response_model=BudgetAlertSchema, status_code=http_status.HTTP_201_CREATED)
def create_budget_alert(
    alert: BudgetAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new budget alert (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can create budget alerts"
        )
    
    db_alert = BudgetAlert(
        service_type=alert.service_type,
        threshold_amount=alert.threshold_amount,
        threshold_percentage=alert.threshold_percentage,
        currency=alert.currency,
        alert_type=alert.alert_type
    )
    
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    return db_alert

@router.get("/budget-alerts", response_model=List[BudgetAlertSchema])
def list_budget_alerts(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List budget alerts (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can view budget alerts"
        )
    
    query = db.query(BudgetAlert)
    
    if is_active is not None:
        query = query.filter(BudgetAlert.is_active == is_active)
    
    alerts = query.order_by(BudgetAlert.created_at.desc()).all()
    
    return alerts

@router.patch("/budget-alerts/{alert_id}", response_model=BudgetAlertSchema)
def update_budget_alert(
    alert_id: str,
    alert_update: BudgetAlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a budget alert (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can update budget alerts"
        )
    
    alert = db.query(BudgetAlert).filter(BudgetAlert.id == alert_id).first()
    
    if not alert:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Budget alert not found"
        )
    
    # Update fields
    update_data = alert_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
    
    db.commit()
    db.refresh(alert)
    
    return alert

@router.get("/budget-status", response_model=BudgetStatus)
def get_budget_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current budget status (admin only)"""
    if current_user.role not in ["admin"]:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only admins can view budget status"
        )
    
    # Get current month's start and end
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Get current month's costs
    current_metrics = db.query(CostMetric).filter(
        CostMetric.metric_type == MetricType.COST,
        CostMetric.period_start >= month_start,
        CostMetric.period_end <= month_end
    ).all()
    
    current_spend = sum(metric.amount for metric in current_metrics)
    
    # Calculate projected spend based on days elapsed
    days_elapsed = (now - month_start).days + 1
    days_in_month = (month_end - month_start).days + 1
    projected_spend = (current_spend / days_elapsed) * days_in_month if days_elapsed > 0 else Decimal('0')
    
    # Budget settings
    monthly_budget = Decimal('500')  # $500 monthly budget
    utilization_percentage = (current_spend / monthly_budget) * 100 if monthly_budget > 0 else Decimal('0')
    days_remaining = days_in_month - days_elapsed
    
    # Determine status
    if utilization_percentage >= 90:
        status = "critical"
    elif utilization_percentage >= 75:
        status = "warning"
    else:
        status = "healthy"
    
    # Get active alerts
    alerts = db.query(BudgetAlert).filter(
        BudgetAlert.is_active == True,
        BudgetAlert.triggered_at.isnot(None),
        BudgetAlert.resolved_at.is_(None)
    ).all()
    
    return BudgetStatus(
        monthly_budget=monthly_budget,
        current_spend=current_spend,
        projected_spend=projected_spend,
        utilization_percentage=utilization_percentage,
        days_remaining=days_remaining,
        status=status,
        alerts=alerts
    )
