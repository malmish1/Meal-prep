import { render,screen,within } from '@testing-library/react'
import { describe,expect,it,vi } from 'vitest'
import { emptyRecipe,type Recipe } from '../domain/recipe'
import { RecipeCard } from './RecipeCard'
import { RecipeDetail } from './RecipeDetail'

const recipe={
 ...emptyRecipe(),
 id:'macro-recipe',
 title:'Komplett makrorätt',
 originalServings:4,
 caloriesPerServing:620,
 proteinGramsPerServing:48,
 carbsGramsPerServing:72,
 fatGramsPerServing:19,
 createdAt:'2026-10-27T10:00:00.000Z',
 updatedAt:'2026-10-27T10:00:00.000Z',
 timesCooked:0,
} as Recipe

function expectAllMacros(){
 const macros=screen.getByLabelText(`Makron per portion för ${recipe.title}`)
 expect(within(macros).getByText('620 kcal')).toBeInTheDocument()
 expect(within(macros).getByText('48 g')).toBeInTheDocument()
 expect(within(macros).getByText('72 g')).toBeInTheDocument()
 expect(within(macros).getByText('19 g')).toBeInTheDocument()
 expect(within(macros).getByText('Energi')).toBeInTheDocument()
 expect(within(macros).getByText('Protein')).toBeInTheDocument()
 expect(within(macros).getByText('Kolhydrater')).toBeInTheDocument()
 expect(within(macros).getByText('Fett')).toBeInTheDocument()
}

describe('complete recipe macros',()=>{
 it('shows all macros while scrolling the recipe list',()=>{
  render(<RecipeCard recipe={recipe} onOpen={vi.fn()}/>)
  expectAllMacros()
 })

 it('shows all macros inside a recipe',()=>{
  render(<RecipeDetail recipe={recipe} onBack={vi.fn()} onEdit={vi.fn()} onFavorite={vi.fn()} onCook={vi.fn()} onDelete={vi.fn()}/>)
  expectAllMacros()
 })
})
