import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,describe,expect,it } from 'vitest'
import App from './App'
import { resetDBConnectionForTests } from './storage/db'
beforeEach(async()=>{location.hash='';await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('meal-prep');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})})
describe('Meal Prep',()=>{
 it('öppnar extern receptsökning via receptfliken',async()=>{render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Recept'}));await userEvent.click(screen.getByRole('tab',{name:'Upptäck'}));expect(screen.getByRole('heading',{name:'Upptäck recept'})).toBeInTheDocument();expect(screen.getByPlaceholderText('Till exempel kyckling eller snabb middag')).toBeInTheDocument()})
 it('navigerar mellan huvudvyerna',async()=>{render(<App/>);expect(screen.getByRole('heading',{name:'Veckans Willys-kampanjer'})).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Recept'}));expect(screen.getByText('Din receptbank är tom')).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Favoriter'}));expect(screen.getByText('Inga recept matchar')).toBeInTheDocument()})
 it('sparar profilen permanent i IndexedDB',async()=>{const view=render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Mer'}));const field=screen.getByLabelText('Namn');await userEvent.type(field,'Victor');await userEvent.click(screen.getByRole('button',{name:'Spara'}));expect(await screen.findByText('Namnet är sparat lokalt.')).toBeInTheDocument();view.unmount();render(<App/>);await waitFor(()=>expect(screen.getByLabelText('Namn')).toHaveValue('Victor'))})
 it('öppnar AI-bildimport från plusmenyn',async()=>{render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Lägg till'}));const button=screen.getByRole('button',{name:/Importera från bilder/});expect(button).toBeEnabled();await userEvent.click(button);expect(screen.getByRole('heading',{name:'Importera recept'})).toBeInTheDocument();expect(screen.getByText('Du bestämmer när bilder skickas')).toBeInTheDocument()})
})
