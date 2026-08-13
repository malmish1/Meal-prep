import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,describe,expect,it } from 'vitest'
import App from './App'
import { resetDBConnectionForTests } from './storage/db'
beforeEach(async()=>{location.hash='';await resetDBConnectionForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('meal-prep');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error)})})
describe('Meal Prep',()=>{
 it('navigerar mellan huvudvyerna',async()=>{render(<App/>);expect(screen.getByText('Din nästa matvecka börjar här.')).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Recept'}));expect(screen.getByText('Din receptbank är tom')).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Favoriter'}));expect(screen.getByText('Inga recept matchar')).toBeInTheDocument()})
 it('sparar profilen permanent i IndexedDB',async()=>{const view=render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Mer'}));const field=screen.getByLabelText('Namn');await userEvent.type(field,'Victor');await userEvent.click(screen.getByRole('button',{name:'Spara'}));expect(await screen.findByText('Namnet är sparat lokalt.')).toBeInTheDocument();view.unmount();render(<App/>);await waitFor(()=>expect(screen.getByLabelText('Namn')).toHaveValue('Victor'))})
 it('visar manuell skapande och kommande bildimport',async()=>{render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Lägg till'}));const dialog=screen.getByRole('dialog');expect(dialog).toHaveTextContent('Skapa manuellt');expect(dialog).toHaveTextContent('Importera från bilder');expect(screen.getByRole('button',{name:/Importera från bilder/})).toBeDisabled()})
})
