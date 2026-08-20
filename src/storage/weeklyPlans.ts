import type{WeeklyPlan}from"../domain/weeklyPlan";
import{normalizeWeeklyPlan}from"../weekly/generator";
import{getDB}from"./db";
export async function saveWeeklyPlan(plan:WeeklyPlan){await(await getDB()).put("weeklyPlans",plan,plan.id);return plan}
export async function listWeeklyPlans(){return(await(await getDB()).getAll("weeklyPlans")as unknown[]).map(normalizeWeeklyPlan).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
export async function getLatestWeeklyPlan(){return(await listWeeklyPlans())[0]}
